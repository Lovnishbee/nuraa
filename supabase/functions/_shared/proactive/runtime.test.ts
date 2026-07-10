import { describe, expect, it } from 'vitest'
import { handleProactiveEngineRequest } from './runtime.ts'
import type { ProactiveSupabaseClient } from './types.ts'

const userId = '00000000-0000-4000-8000-000000000001'
const now = new Date('2026-07-09T15:00:00.000Z')

describe('Phase V-A proactive runtime', () => {
  it('fails closed before persistence when the user is not an enabled tester', async () => {
    const data = baseData({ tester: { user_id: userId, enabled: false, consent_granted: true } })
    const result = await handleProactiveEngineRequest({
      client: fakeClient(data),
      env: {},
      userId,
      body: { action: 'generate_candidates' },
      now,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response).toMatchObject({ status: 'disabled', reason: 'not_internal_tester' })
    expect(data.insight_candidates).toHaveLength(0)
  })

  it('fails closed when Coach consent is missing', async () => {
    const data = baseData({ aiPreferences: { user_id: userId, ai_coaching_enabled: false } })
    const result = await handleProactiveEngineRequest({
      client: fakeClient(data),
      env: {},
      userId,
      body: { action: 'generate_candidates' },
      now,
    })

    expect(result.response).toMatchObject({ status: 'disabled', reason: 'ai_coaching_consent_required' })
    expect(data.insight_candidates).toHaveLength(0)
  })

  it('fails closed when Phase V flags are disabled', async () => {
    const data = baseData({ flagsEnabled: false })
    const result = await handleProactiveEngineRequest({
      client: fakeClient(data),
      env: {},
      userId,
      body: { action: 'generate_candidates' },
      now,
    })

    expect(result.response).toMatchObject({ status: 'disabled', reason: 'phase_v_flags_disabled' })
    expect(data.insight_candidates).toHaveLength(0)
  })

  it('generates and upserts candidates for an eligible tester', async () => {
    const data = baseData()
    const result = await handleProactiveEngineRequest({
      client: fakeClient(data),
      env: {},
      userId,
      body: { action: 'generate_candidates' },
      now,
    })

    expect(result.response).toMatchObject({ status: 'completed' })
    expect(data.proactive_guidance_preferences).toHaveLength(1)
    expect(data.insight_candidates.length).toBeGreaterThan(0)
    expect(data.insight_candidates.every((row) => row.user_id === userId)).toBe(true)
  })

  it('keeps generation idempotent for user, health date, theme, and engine version', async () => {
    const data = baseData()
    const client = fakeClient(data)
    await handleProactiveEngineRequest({ client, env: {}, userId, body: { action: 'generate_candidates' }, now })
    const firstCount = data.insight_candidates.length
    await handleProactiveEngineRequest({ client, env: {}, userId, body: { action: 'generate_candidates' }, now })

    expect(data.insight_candidates).toHaveLength(firstCount)
  })

  it('rejects unknown fields and never accepts a client-supplied user id', async () => {
    const data = baseData()
    const result = await handleProactiveEngineRequest({
      client: fakeClient(data),
      env: {},
      userId,
      body: { action: 'generate_candidates', userId: 'attacker' },
      now,
    })

    expect(result.httpStatus).toBe(400)
    expect(data.insight_candidates).toHaveLength(0)
  })
})

function baseData(options: {
  tester?: Record<string, unknown>
  aiPreferences?: Record<string, unknown>
  flagsEnabled?: boolean
} = {}): Record<string, Array<Record<string, unknown>>> {
  const flagsEnabled = options.flagsEnabled ?? true
  return {
    ai_internal_testers: [options.tester ?? { user_id: userId, enabled: true, consent_granted: true }],
    user_ai_preferences: [options.aiPreferences ?? { user_id: userId, ai_coaching_enabled: true }],
    ai_feature_flags: [
      { feature_name: 'ENABLE_PROACTIVE_INTELLIGENCE', enabled: flagsEnabled },
      { feature_name: 'ENABLE_PHASE_V_DEV_SURFACE', enabled: flagsEnabled },
    ],
    profiles: [{ id: userId, timezone: 'Asia/Kolkata' }],
    proactive_guidance_preferences: [],
    nuraa_scores: [
      { id: 'score-1', user_id: userId, score_date: '2026-07-09', total_score: 80, readiness_category: 'Ready', confidence: 80 },
      { id: 'score-2', user_id: userId, score_date: '2026-07-08', total_score: 70, readiness_category: 'Ready', confidence: 80 },
    ],
    score_factors: [
      { id: 'factor-1', user_id: userId, score_date: '2026-07-09', sleep_score: 82, stress_score: 72, recovery_score: 74, activity_score: 72, nutrition_score: 70, hydration_score: 78, confidence: 80 },
      { id: 'factor-2', user_id: userId, score_date: '2026-07-08', sleep_score: 80, stress_score: 72, recovery_score: 74, activity_score: 72, nutrition_score: 70, hydration_score: 75, confidence: 80 },
      { id: 'factor-3', user_id: userId, score_date: '2026-07-07', sleep_score: 81, stress_score: 72, recovery_score: 74, activity_score: 72, nutrition_score: 70, hydration_score: 73, confidence: 80 },
      { id: 'factor-4', user_id: userId, score_date: '2026-07-02', sleep_score: 80, stress_score: 72, recovery_score: 74, activity_score: 70, nutrition_score: 70, hydration_score: 60, confidence: 80 },
    ],
    health_signals: [
      { id: 'signal-1', user_id: userId, signal_date: '2026-07-09', sleep_score: 82, sleep_quality: 4, stress_level: 3, energy_level: 4, overall_signal_confidence: 80 },
      { id: 'signal-2', user_id: userId, signal_date: '2026-07-08', sleep_score: 80, sleep_quality: 4, stress_level: 3, energy_level: 4, overall_signal_confidence: 80 },
      { id: 'signal-3', user_id: userId, signal_date: '2026-07-07', sleep_score: 81, sleep_quality: 4, stress_level: 3, energy_level: 4, overall_signal_confidence: 80 },
      { id: 'signal-4', user_id: userId, signal_date: '2026-07-06', sleep_score: 79, sleep_quality: 4, stress_level: 3, energy_level: 4, overall_signal_confidence: 80 },
    ],
    daily_checkins: [],
    daily_briefs: [{ id: 'brief-1', user_id: userId, brief_date: '2026-07-09', headline: 'Steady day', tone: 'supportive' }],
    insight_events: [],
    user_goals: [{ id: 'goal-1', user_id: userId, goal_type: 'sleep', goal_label: 'Better Sleep', priority: 1, status: 'active' }],
    user_preferences: [],
    coach_feedback: [],
    insight_candidates: [],
  }
}

function fakeClient(data: Record<string, Array<Record<string, unknown>>>): ProactiveSupabaseClient {
  return {
    from(table: string) {
      let rows = [...(data[table] ?? [])]
      let selectedInsertRows: Array<Record<string, unknown>> | null = null
      const builder = {
        select: () => builder,
        insert: (values: unknown) => {
          selectedInsertRows = insertRows(data, table, values)
          rows = selectedInsertRows
          return builder
        },
        upsert: (values: unknown) => {
          selectedInsertRows = upsertRows(data, table, values)
          rows = selectedInsertRows
          return builder
        },
        update: () => builder,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value)
          return builder
        },
        gte: (column: string, value: unknown) => {
          rows = rows.filter((row) => String(row[column]) >= String(value))
          return builder
        },
        lte: (column: string, value: unknown) => {
          rows = rows.filter((row) => String(row[column]) <= String(value))
          return builder
        },
        in: (column: string, value: unknown[]) => {
          rows = rows.filter((row) => value.includes(row[column]))
          return builder
        },
        order: (column: string, options?: { ascending?: boolean }) => {
          rows = [...rows].sort((left, right) => options?.ascending ? String(left[column]).localeCompare(String(right[column])) : String(right[column]).localeCompare(String(left[column])))
          return builder
        },
        limit: (count: number) => {
          rows = rows.slice(0, count)
          return builder
        },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        single: async () => ({ data: rows[0] ?? null, error: null }),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: selectedInsertRows ?? rows, error: null })),
      }
      return builder
    },
  } as unknown as ProactiveSupabaseClient
}

function insertRows(data: Record<string, Array<Record<string, unknown>>>, table: string, values: unknown) {
  const records = Array.isArray(values) ? values : [values]
  const inserted = records.map((record) => ({ id: crypto.randomUUID(), ...(record as Record<string, unknown>) }))
  data[table] = [...(data[table] ?? []), ...inserted]
  return inserted
}

function upsertRows(data: Record<string, Array<Record<string, unknown>>>, table: string, values: unknown) {
  const records = Array.isArray(values) ? values : [values]
  const upserted: Array<Record<string, unknown>> = []
  data[table] = data[table] ?? []
  for (const value of records) {
    const record = value as Record<string, unknown>
    const existingIndex = data[table].findIndex((row) => matchesConflict(table, row, record))
    const next = existingIndex >= 0 ? { ...data[table][existingIndex], ...record } : { id: crypto.randomUUID(), ...record }
    if (existingIndex >= 0) data[table][existingIndex] = next
    else data[table].push(next)
    upserted.push(next)
  }
  return upserted
}

function matchesConflict(table: string, left: Record<string, unknown>, right: Record<string, unknown>) {
  if (table === 'proactive_guidance_preferences') return left.user_id === right.user_id
  if (table === 'insight_candidates') {
    return left.user_id === right.user_id
      && left.health_date === right.health_date
      && left.theme_key === right.theme_key
      && left.created_by_engine_version === right.created_by_engine_version
  }
  return false
}
