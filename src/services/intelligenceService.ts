import { generateDailyBrief } from '@/features/intelligence/brief-engine'
import { buildHealthSignal } from '@/features/intelligence/signal-engine'
import { calculateNuraaScore } from '@/features/intelligence/score-engine'
import { runInsightRules } from '@/features/intelligence/rules-engine'
import type { DailyBrief, HealthSignal, InsightRuleResult, NuraaScoreResult } from '@/features/intelligence/types'
import { getSupabaseClient } from '@/lib/supabase'
import type { DailyBriefRow, DailyCheckin, HealthSignalRow, InsightEvent, ScoreFactor } from '@/types/database'
import { getProfileBundle, type ProfileBundle } from './profile'

export type IntelligenceResult = {
  signal: HealthSignal
  score: NuraaScoreResult
  brief: DailyBrief
  insights: InsightRuleResult[]
}

export function buildIntelligenceFromBundle(bundle: ProfileBundle, checkin: DailyCheckin | null): IntelligenceResult {
  const signal = buildHealthSignal({ ...bundle, checkin })
  const score = calculateNuraaScore(signal)
  const insights = runInsightRules(signal)
  const brief = generateDailyBrief(signal, score, insights)
  return { signal, score, brief, insights }
}

function healthSignalPayload(signal: HealthSignal) {
  return {
    user_id: signal.userId,
    signal_date: signal.date,
    sleep_hours: signal.sleep.hours,
    sleep_quality: signal.sleep.quality,
    stress_level: signal.stress.level,
    energy_level: signal.recovery.energy,
    soreness_level: signal.recovery.soreness,
    motivation_level: signal.recovery.motivation,
    mood: signal.context.mood ?? null,
    activity_score: signal.activity.movementScore,
    nutrition_score: signal.nutrition.score,
    hydration_score: signal.hydration.score,
    recovery_score: signal.recovery.score,
    sleep_score: signal.sleep.score,
    stress_score: signal.stress.score,
    overall_signal_confidence: Math.round((signal.sleep.confidence + signal.stress.confidence + signal.recovery.confidence + signal.activity.confidence + signal.nutrition.confidence + signal.hydration.confidence) / 6),
    raw_signal_json: signal,
  }
}

function scoreFactorPayload(score: NuraaScoreResult) {
  return {
    user_id: score.userId,
    score_date: score.date,
    sleep_score: score.factors.sleep,
    stress_score: score.factors.stress,
    recovery_score: score.factors.recovery,
    activity_score: score.factors.activity,
    nutrition_score: score.factors.nutrition,
    hydration_score: score.factors.hydration,
    confidence: score.confidence,
    primary_driver: score.primaryDriver,
    limiting_factor: score.limitingFactor,
  }
}

function briefPayload(brief: DailyBrief) {
  return {
    user_id: brief.userId,
    brief_date: brief.date,
    headline: brief.headline,
    summary: brief.summary,
    focus_items: brief.focus,
    insight: brief.insight,
    tone: brief.tone,
    source: 'rules_engine',
  }
}

async function persistInsights(userId: string, date: string, insights: InsightRuleResult[]): Promise<InsightEvent[]> {
  const supabase = getSupabaseClient()
  const deleteExisting = await supabase.from('insight_events').delete().eq('user_id', userId).eq('event_date', date)
  if (deleteExisting.error) throw deleteExisting.error

  const insert = await supabase
    .from('insight_events')
    .insert(insights.map((insight) => ({
      user_id: userId,
      event_date: date,
      rule_id: insight.ruleId,
      title: insight.title,
      description: insight.description,
      category: insight.category,
      severity: insight.severity,
      recommendation: insight.recommendation,
    })))
    .select('*')

  if (insert.error) throw insert.error
  return insert.data ?? []
}

export async function persistIntelligence(result: IntelligenceResult) {
  const supabase = getSupabaseClient()
  const [signal, score, factors, brief] = await Promise.all([
    supabase.from('health_signals').upsert(healthSignalPayload(result.signal), { onConflict: 'user_id,signal_date' }).select('*').single(),
    supabase.from('nuraa_scores').upsert({
      user_id: result.score.userId,
      score_date: result.score.date,
      total_score: result.score.totalScore,
      readiness_category: result.score.category,
      score_reason: result.score.explanation,
      recommended_focus: result.score.recommendations[0]?.title ?? result.brief.focus[0]?.title ?? 'Keep your basics steady',
      confidence: result.score.confidence,
      primary_driver: result.score.primaryDriver,
      limiting_factor: result.score.limitingFactor,
    }, { onConflict: 'user_id,score_date' }).select('*').single(),
    supabase.from('score_factors').upsert(scoreFactorPayload(result.score), { onConflict: 'user_id,score_date' }).select('*').single(),
    supabase.from('daily_briefs').upsert(briefPayload(result.brief), { onConflict: 'user_id,brief_date' }).select('*').single(),
  ])

  if (signal.error || score.error || factors.error || brief.error) throw signal.error ?? score.error ?? factors.error ?? brief.error

  const insights = await persistInsights(result.score.userId, result.score.date, result.insights)
  return {
    signal: signal.data as HealthSignalRow,
    score: score.data,
    factors: factors.data as ScoreFactor,
    brief: brief.data as DailyBriefRow,
    insights,
  }
}

export async function generateAndPersistIntelligenceForCheckin(userId: string, checkin: DailyCheckin) {
  const bundle = await getProfileBundle(userId)
  const result = buildIntelligenceFromBundle(bundle, checkin)
  const persisted = await persistIntelligence(result)
  return { ...result, persisted }
}

export async function backfillMissingIntelligenceForUser(userId: string) {
  const supabase = getSupabaseClient()
  const checkins = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .order('checkin_date', { ascending: false })
    .limit(30)

  if (checkins.error) throw checkins.error
  if (!checkins.data?.length) return []

  const dates = checkins.data.map((checkin) => checkin.checkin_date)
  const existing = await supabase.from('score_factors').select('score_date').eq('user_id', userId).in('score_date', dates)
  if (existing.error) throw existing.error

  const existingDates = new Set((existing.data ?? []).map((row) => row.score_date))
  const missing = checkins.data.filter((checkin) => !existingDates.has(checkin.checkin_date))
  if (!missing.length) return []

  const bundle = await getProfileBundle(userId)
  const persisted = []
  for (const checkin of missing.reverse()) {
    const result = buildIntelligenceFromBundle(bundle, checkin)
    persisted.push(await persistIntelligence(result))
  }
  return persisted
}
