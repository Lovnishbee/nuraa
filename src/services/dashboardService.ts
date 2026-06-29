import { getSupabaseClient } from '@/lib/supabase'
import type { DailyBriefRow, HealthSignalRow, InsightEvent, NuraaScore, ScoreFactor } from '@/types/database'
import { backfillMissingIntelligenceForUser } from './intelligenceService'

export type DashboardIntelligenceSummary = {
  score: NuraaScore | null
  scoreHistory: NuraaScore[]
  signal: HealthSignalRow | null
  brief: DailyBriefRow | null
  factors: ScoreFactor | null
  insights: InsightEvent[]
}

export async function getDashboardIntelligenceSummary(userId: string): Promise<DashboardIntelligenceSummary> {
  await backfillMissingIntelligenceForUser(userId)
  const supabase = getSupabaseClient()
  const historyStart = new Date()
  historyStart.setDate(historyStart.getDate() - 6)
  const [score, scoreHistory, signal, brief, factors, insights] = await Promise.all([
    supabase.from('nuraa_scores').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('nuraa_scores').select('*').eq('user_id', userId).gte('score_date', historyStart.toISOString().slice(0, 10)).order('score_date', { ascending: true }),
    supabase.from('health_signals').select('*').eq('user_id', userId).order('signal_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('daily_briefs').select('*').eq('user_id', userId).order('brief_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('score_factors').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('insight_events').select('*').eq('user_id', userId).order('event_date', { ascending: false }).order('created_at', { ascending: false }).limit(6),
  ])
  if (score.error || scoreHistory.error || signal.error || brief.error || factors.error || insights.error) throw score.error ?? scoreHistory.error ?? signal.error ?? brief.error ?? factors.error ?? insights.error
  return { score: score.data, scoreHistory: scoreHistory.data ?? [], signal: signal.data, brief: brief.data, factors: factors.data, insights: insights.data ?? [] }
}
