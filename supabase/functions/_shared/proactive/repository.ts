import { getLocalISODate } from '../ai/date.ts'
import { PROACTIVE_ENGINE_VERSION, type CoachFeedbackAggregate, type DailyBriefRow, type DailyCheckinSafeRow, type HealthSignalRow, type InsightCandidate, type InsightEventRow, type ProactiveGuidancePreferences, type ProactiveSnapshot, type ProactiveSupabaseClient, type ScoreFactorRow, type ScoreRow, type UserGoalRow, type UserPreferencesSafeRow } from './types.ts'

const phaseVFlags = ['ENABLE_PROACTIVE_INTELLIGENCE', 'ENABLE_PHASE_V_DEV_SURFACE']

export async function evaluateProactiveAccess(client: ProactiveSupabaseClient, userId: string) {
  const [tester, preferences, flags] = await Promise.all([
    client.from('ai_internal_testers').select('enabled, consent_granted').eq('user_id', userId).maybeSingle<{ enabled: boolean; consent_granted: boolean }>(),
    client.from('user_ai_preferences').select('ai_coaching_enabled').eq('user_id', userId).maybeSingle<{ ai_coaching_enabled: boolean }>(),
    client.from('ai_feature_flags').select('feature_name, enabled').in('feature_name', phaseVFlags),
  ])

  if (tester.error || preferences.error || flags.error) return { enabled: false, reason: 'access_lookup_failed' }
  if (!tester.data?.enabled || !tester.data.consent_granted) return { enabled: false, reason: 'not_internal_tester' }
  if (!preferences.data?.ai_coaching_enabled) return { enabled: false, reason: 'ai_coaching_consent_required' }
  const rows = ((flags.data ?? []) as Array<{ feature_name: string; enabled: boolean }>)
  const enabledFlags = new Map(rows.map((row) => [row.feature_name, row.enabled]))
  if (!phaseVFlags.every((flag) => enabledFlags.get(flag) === true)) return { enabled: false, reason: 'phase_v_flags_disabled' }
  return { enabled: true, reason: null }
}

export async function buildProactiveSnapshot(client: ProactiveSupabaseClient, userId: string, now = new Date()): Promise<ProactiveSnapshot> {
  const profile = await client.from('profiles').select('id, timezone').eq('id', userId).maybeSingle<{ id: string; timezone: string | null }>()
  if (profile.error || !profile.data) throw new Error('PROFILE_NOT_FOUND')
  const timezone = profile.data.timezone ?? 'Asia/Kolkata'
  const healthDate = getLocalISODate(timezone, now)
  const windowStart = getLocalISODate(timezone, addDays(now, -6))
  const previousWindowStart = getLocalISODate(timezone, addDays(now, -13))
  const nowIso = now.toISOString()

  const preferences = await ensureProactivePreferences(client, userId)
  const [
    scores,
    scoreFactors,
    healthSignals,
    dailyCheckins,
    dailyBriefs,
    insightEvents,
    goals,
    userPreferences,
    coachFeedback,
    existingCandidates,
  ] = await Promise.all([
    client.from('nuraa_scores').select('*').eq('user_id', userId).gte('score_date', previousWindowStart).lte('score_date', healthDate).order('score_date', { ascending: false }),
    client.from('score_factors').select('*').eq('user_id', userId).gte('score_date', previousWindowStart).lte('score_date', healthDate).order('score_date', { ascending: false }),
    client.from('health_signals').select('*').eq('user_id', userId).gte('signal_date', previousWindowStart).lte('signal_date', healthDate).order('signal_date', { ascending: false }),
    client.from('daily_checkins').select('id, user_id, checkin_date, stress_level, sleep_quality, energy_level, created_at').eq('user_id', userId).gte('checkin_date', previousWindowStart).lte('checkin_date', healthDate).order('checkin_date', { ascending: false }),
    client.from('daily_briefs').select('id, user_id, brief_date, headline, tone').eq('user_id', userId).gte('brief_date', previousWindowStart).lte('brief_date', healthDate).order('brief_date', { ascending: false }),
    client.from('insight_events').select('id, user_id, event_date, rule_id, category, severity').eq('user_id', userId).gte('event_date', previousWindowStart).lte('event_date', healthDate).order('event_date', { ascending: false }),
    client.from('user_goals').select('id, user_id, goal_type, goal_label, priority, status').eq('user_id', userId).eq('status', 'active'),
    client.from('user_preferences').select('id, user_id, diet_preference, preferred_workout_time, work_type, work_schedule, commute_minutes, travel_frequency').eq('user_id', userId).maybeSingle<UserPreferencesSafeRow>(),
    client.from('coach_feedback').select('feedback_type').eq('user_id', userId).gte('created_at', getLocalISODate(timezone, addDays(now, -30))),
    client.from('insight_candidates').select('*').eq('user_id', userId).gte('created_at', new Date(now.getTime() - 30 * 86_400_000).toISOString()).order('created_at', { ascending: false }),
  ])

  assertNoError(scores.error, 'SCORES_READ_FAILED')
  assertNoError(scoreFactors.error, 'SCORE_FACTORS_READ_FAILED')
  assertNoError(healthSignals.error, 'HEALTH_SIGNALS_READ_FAILED')
  assertNoError(dailyCheckins.error, 'CHECKINS_READ_FAILED')
  assertNoError(dailyBriefs.error, 'DAILY_BRIEFS_READ_FAILED')
  assertNoError(insightEvents.error, 'INSIGHT_EVENTS_READ_FAILED')
  assertNoError(goals.error, 'GOALS_READ_FAILED')
  assertNoError(userPreferences.error, 'PREFERENCES_READ_FAILED')
  assertNoError(coachFeedback.error, 'COACH_FEEDBACK_READ_FAILED')
  assertNoError(existingCandidates.error, 'EXISTING_CANDIDATES_READ_FAILED')

  return {
    userId,
    timezone,
    healthDate,
    windowStart,
    windowEnd: healthDate,
    nowIso,
    scores: (scores.data ?? []) as ScoreRow[],
    scoreFactors: (scoreFactors.data ?? []) as ScoreFactorRow[],
    healthSignals: (healthSignals.data ?? []) as HealthSignalRow[],
    dailyCheckins: (dailyCheckins.data ?? []) as DailyCheckinSafeRow[],
    dailyBriefs: (dailyBriefs.data ?? []) as DailyBriefRow[],
    insightEvents: (insightEvents.data ?? []) as InsightEventRow[],
    goals: (goals.data ?? []) as UserGoalRow[],
    userPreferences: userPreferences.data,
    coachFeedback: aggregateCoachFeedback((coachFeedback.data ?? []) as Array<{ feedback_type: string }>),
    existingCandidates: (existingCandidates.data ?? []) as InsightCandidate[],
    preferences,
  }
}

export async function persistInsightCandidates(client: ProactiveSupabaseClient, candidates: InsightCandidate[]) {
  if (candidates.length === 0) return []
  const payload = candidates.map((candidate) => ({
    user_id: candidate.user_id,
    health_date: candidate.health_date,
    theme_key: candidate.theme_key,
    candidate_hash: candidate.candidate_hash,
    data_window_start: candidate.data_window_start,
    data_window_end: candidate.data_window_end,
    candidate_type: candidate.candidate_type,
    category: candidate.category,
    severity: candidate.severity,
    confidence_score: candidate.confidence_score,
    confidence_label: candidate.confidence_label,
    deterministic_title: candidate.deterministic_title,
    deterministic_summary: candidate.deterministic_summary,
    recommended_action: candidate.recommended_action,
    evidence_json: candidate.evidence_json,
    source_references: candidate.source_references,
    ranking_score: candidate.ranking_score,
    status: candidate.status,
    eligible_from: candidate.eligible_from,
    expires_at: candidate.expires_at,
    suppression_reason: candidate.suppression_reason,
    created_by_engine_version: candidate.created_by_engine_version,
  }))
  const result = await client
    .from('insight_candidates')
    .upsert(payload, { onConflict: 'user_id,health_date,theme_key,created_by_engine_version' })
    .select('*')
  assertNoError(result.error, 'CANDIDATE_UPSERT_FAILED')
  return (result.data ?? []) as InsightCandidate[]
}

export async function getProactiveSummary(client: ProactiveSupabaseClient, userId: string) {
  const result = await client
    .from('insight_candidates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  assertNoError(result.error, 'CANDIDATE_SUMMARY_FAILED')
  return (result.data ?? []) as InsightCandidate[]
}

async function ensureProactivePreferences(client: ProactiveSupabaseClient, userId: string): Promise<ProactiveGuidancePreferences> {
  const result = await client
    .from('proactive_guidance_preferences')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })
    .select('*')
    .single<ProactiveGuidancePreferences>()
  assertNoError(result.error, 'PROACTIVE_PREFERENCES_FAILED')
  if (!result.data) throw new Error('PROACTIVE_PREFERENCES_FAILED')
  return normalizePreferences(result.data)
}

function normalizePreferences(row: ProactiveGuidancePreferences): ProactiveGuidancePreferences {
  return {
    ...row,
    proactive_guidance_enabled: row.proactive_guidance_enabled !== false,
    max_cards_per_day: typeof row.max_cards_per_day === 'number' ? row.max_cards_per_day : 3,
    muted_categories: Array.isArray(row.muted_categories) ? row.muted_categories : [],
    reduced_categories: Array.isArray(row.reduced_categories) ? row.reduced_categories : [],
  }
}

function aggregateCoachFeedback(rows: Array<{ feedback_type: string }>): CoachFeedbackAggregate[] {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.feedback_type, (counts.get(row.feedback_type) ?? 0) + 1)
  return Array.from(counts.entries()).map(([feedback_type, count]) => ({ feedback_type, count }))
}

function assertNoError(error: unknown, code: string): asserts error is null {
  if (error) throw new Error(code)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export { PROACTIVE_ENGINE_VERSION }
