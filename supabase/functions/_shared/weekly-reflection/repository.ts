import { getLocalISODate } from '../ai/date.ts'
import { readBooleanEnv } from '../ai/config.ts'
import { buildWeeklyWindow } from './weekly-metrics.ts'
import type { WeeklyReflection, WeeklyReflectionMetrics, WeeklyReflectionPayload, WeeklyReflectionRuntimeEnv, WeeklyReflectionSnapshot, WeeklyReflectionSupabaseClient, WeeklyReflectionSourceReference } from './types.ts'

const accessFlags = ['ENABLE_WEEKLY_REFLECTION']

export async function evaluateWeeklyReflectionAccess(client: WeeklyReflectionSupabaseClient, env: WeeklyReflectionRuntimeEnv, userId: string) {
  const [preferences, flags] = await Promise.all([
    client.from('user_ai_preferences').select('ai_coaching_enabled').eq('user_id', userId).maybeSingle<{ ai_coaching_enabled: boolean }>(),
    client.from('ai_feature_flags').select('feature_name, enabled').in('feature_name', accessFlags),
  ])
  if (preferences.error || flags.error) return { enabled: false, reason: 'access_lookup_failed' }
  if (!preferences.data?.ai_coaching_enabled) return { enabled: false, reason: 'ai_coaching_consent_required' }
  if (!readBooleanEnv(env, 'ENABLE_WEEKLY_REFLECTION', false)) return { enabled: false, reason: 'weekly_reflection_env_disabled' }
  const flagRows = new Map(((flags.data ?? []) as Array<{ feature_name: string; enabled: boolean }>).map((row) => [row.feature_name, row.enabled]))
  if (!accessFlags.every((flag) => flagRows.get(flag) === true)) return { enabled: false, reason: 'weekly_reflection_flag_disabled' }
  return { enabled: true, reason: null }
}

export async function buildWeeklyReflectionSnapshot(client: WeeklyReflectionSupabaseClient, userId: string, now = new Date()): Promise<WeeklyReflectionSnapshot> {
  const profile = await client.from('profiles').select('id, timezone').eq('id', userId).maybeSingle<{ id: string; timezone: string | null }>()
  if (profile.error || !profile.data) throw new Error('PROFILE_NOT_FOUND')
  const timezone = profile.data.timezone ?? 'Asia/Kolkata'
  const window = buildWeeklyWindow(timezone, now)
  const previousWindowStart = window.previousWeekStartDate
  const healthDate = getLocalISODate(timezone, now)
  const nowIso = now.toISOString()

  const [scores, scoreFactors, healthSignals, dailyBriefs, insightEvents, goals, cardFeedback, checkins] = await Promise.all([
    client.from('nuraa_scores').select('*').eq('user_id', userId).gte('score_date', previousWindowStart).lte('score_date', window.weekEndDate).order('score_date', { ascending: false }),
    client.from('score_factors').select('*').eq('user_id', userId).gte('score_date', previousWindowStart).lte('score_date', window.weekEndDate).order('score_date', { ascending: false }),
    client.from('health_signals').select('*').eq('user_id', userId).gte('signal_date', previousWindowStart).lte('signal_date', window.weekEndDate).order('signal_date', { ascending: false }),
    client.from('daily_briefs').select('id, user_id, brief_date, headline, tone').eq('user_id', userId).gte('brief_date', previousWindowStart).lte('brief_date', window.weekEndDate).order('brief_date', { ascending: false }),
    client.from('insight_events').select('id, user_id, event_date, rule_id, title, description, category, severity, recommendation').eq('user_id', userId).gte('event_date', previousWindowStart).lte('event_date', window.weekEndDate).order('event_date', { ascending: false }),
    client.from('user_goals').select('id, user_id, goal_type, goal_label, priority, status').eq('user_id', userId).eq('status', 'active').order('priority', { ascending: true }).limit(3),
    client.from('proactive_card_feedback').select('id, user_id, feedback_type, created_at').eq('user_id', userId).gte('created_at', `${window.weekStartDate}T00:00:00.000Z`).order('created_at', { ascending: false }),
    client.from('daily_checkins').select('id, user_id, checkin_date, created_at').eq('user_id', userId).gte('checkin_date', window.weekStartDate).lte('checkin_date', window.weekEndDate).order('checkin_date', { ascending: false }),
  ])

  assertNoError(scores.error, 'WEEKLY_SCORES_READ_FAILED')
  assertNoError(scoreFactors.error, 'WEEKLY_SCORE_FACTORS_READ_FAILED')
  // Weekly Reflection can still produce a safe limited-data summary when
  // auxiliary context is temporarily unavailable. Scores/factors remain the
  // deterministic source of truth; the rest only enriches the reflection.

  return {
    userId,
    timezone,
    healthDate,
    weekStartDate: window.weekStartDate,
    weekEndDate: window.weekEndDate,
    previousWeekStartDate: window.previousWeekStartDate,
    previousWeekEndDate: window.previousWeekEndDate,
    nowIso,
    scores: (scores.data ?? []) as Array<Record<string, unknown>>,
    scoreFactors: (scoreFactors.data ?? []) as Array<Record<string, unknown>>,
    healthSignals: rowsOrEmpty(healthSignals) as Array<Record<string, unknown>>,
    dailyBriefs: rowsOrEmpty(dailyBriefs) as Array<Record<string, unknown>>,
    insightEvents: rowsOrEmpty(insightEvents) as Array<Record<string, unknown>>,
    goals: rowsOrEmpty(goals) as Array<Record<string, unknown>>,
    cardFeedback: rowsOrEmpty(cardFeedback) as Array<Record<string, unknown>>,
    checkins: rowsOrEmpty(checkins) as Array<Record<string, unknown>>,
  }
}

export async function persistWeeklyReflection(client: WeeklyReflectionSupabaseClient, values: {
  userId: string
  metrics: WeeklyReflectionMetrics
  payload: WeeklyReflectionPayload
  sourceReferences: WeeklyReflectionSourceReference[]
  contextEnvelopeId?: string | null
  aiExecutionId?: string | null
}) {
  const result = await client.from('weekly_reflections').upsert({
    user_id: values.userId,
    week_start_date: values.metrics.weekStartDate,
    week_end_date: values.metrics.weekEndDate,
    status: 'generated',
    summary_payload: values.payload,
    deterministic_metrics: values.metrics,
    source_references: values.sourceReferences,
    context_envelope_id: values.contextEnvelopeId ?? null,
    ai_execution_id: values.aiExecutionId ?? null,
    viewed_at: null,
    dismissed_at: null,
    converted_to_coach_at: null,
  }, { onConflict: 'user_id,week_start_date,week_end_date' }).select('*').single<WeeklyReflection>()
  assertNoError(result.error, 'WEEKLY_REFLECTION_UPSERT_FAILED')
  return normalizeWeeklyReflection(result.data)
}

export async function getCurrentWeeklyReflection(client: WeeklyReflectionSupabaseClient, userId: string, now = new Date()) {
  const profile = await client.from('profiles').select('timezone').eq('id', userId).maybeSingle<{ timezone: string | null }>()
  if (profile.error) throw new Error('PROFILE_NOT_FOUND')
  const window = buildWeeklyWindow(profile.data?.timezone ?? 'Asia/Kolkata', now)
  const result = await client.from('weekly_reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', window.weekStartDate)
    .eq('week_end_date', window.weekEndDate)
    .maybeSingle<WeeklyReflection>()
  assertNoError(result.error, 'WEEKLY_REFLECTION_READ_FAILED')
  return result.data ? normalizeWeeklyReflection(result.data) : null
}

export async function getOwnedWeeklyReflection(client: WeeklyReflectionSupabaseClient, userId: string, reflectionId: string) {
  const result = await client.from('weekly_reflections').select('*').eq('id', reflectionId).eq('user_id', userId).maybeSingle<WeeklyReflection>()
  assertNoError(result.error, 'WEEKLY_REFLECTION_READ_FAILED')
  return result.data ? normalizeWeeklyReflection(result.data) : null
}

export async function updateWeeklyReflectionLifecycle(client: WeeklyReflectionSupabaseClient, userId: string, reflectionId: string, values: Partial<Pick<WeeklyReflection, 'status' | 'viewed_at' | 'dismissed_at' | 'converted_to_coach_at'>>) {
  const result = await client.from('weekly_reflections')
    .update(values)
    .eq('id', reflectionId)
    .eq('user_id', userId)
    .select('*')
    .single<WeeklyReflection>()
  assertNoError(result.error, 'WEEKLY_REFLECTION_UPDATE_FAILED')
  return normalizeWeeklyReflection(result.data)
}

function normalizeWeeklyReflection(row: WeeklyReflection): WeeklyReflection {
  return {
    ...row,
    summary_payload: normalizeObject(row.summary_payload) as WeeklyReflection['summary_payload'],
    deterministic_metrics: normalizeObject(row.deterministic_metrics) as WeeklyReflection['deterministic_metrics'],
    source_references: Array.isArray(row.source_references) ? row.source_references as WeeklyReflection['source_references'] : [],
  }
}

function normalizeObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function assertNoError(error: unknown, code: string): asserts error is null {
  if (error) throw new Error(code)
}

function rowsOrEmpty(result: { data?: unknown[] | null; error?: unknown }) {
  if (result.error || !Array.isArray(result.data)) return []
  return result.data
}
