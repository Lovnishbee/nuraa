import { describe, expect, it } from 'vitest'
import { handleWeeklyReflectionRequest } from './runtime.ts'
import type { WeeklyReflectionSupabaseClient } from './types.ts'

const userId = '00000000-0000-4000-8000-000000000001'

describe('Phase V-C weekly reflection runtime', () => {
  it('fails closed before weekly reflection writes when access is disabled', async () => {
    const data = baseData({ weeklyFlagEnabled: false })

    const result = await handleWeeklyReflectionRequest({
      client: fakeClient(data),
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'generate_weekly_reflection' },
    })

    expect(result.response).toMatchObject({ status: 'disabled' })
    expect(data.weekly_reflections).toHaveLength(0)
  })

  it('generates one idempotent weekly reflection for the local 7-day window', async () => {
    const data = baseData()
    const client = fakeClient(data)

    const first = await handleWeeklyReflectionRequest({
      client,
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'generate_weekly_reflection' },
    })
    const second = await handleWeeklyReflectionRequest({
      client,
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'generate_weekly_reflection' },
    })

    expect(first.response).toMatchObject({ status: 'completed' })
    expect(second.response).toMatchObject({ status: 'completed' })
    expect(data.weekly_reflections).toHaveLength(1)
    expect(data.weekly_reflections[0].week_start_date).toBe('2026-07-07')
    expect(data.weekly_reflections[0].week_end_date).toBe('2026-07-13')
  })

  it('supports viewed, dismissed, and Coach handoff lifecycle actions for owned reflections', async () => {
    const data = baseData()
    const client = fakeClient(data)
    await handleWeeklyReflectionRequest({
      client,
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'generate_weekly_reflection' },
    })
    const reflectionId = String(data.weekly_reflections[0].id)

    const viewed = await handleWeeklyReflectionRequest({
      client,
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'mark_viewed', reflectionId },
    })
    const dismissed = await handleWeeklyReflectionRequest({
      client,
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'dismiss_reflection', reflectionId },
    })
    const handoff = await handleWeeklyReflectionRequest({
      client,
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'start_coach_handoff', reflectionId },
    })

    expect(viewed.response).toMatchObject({ status: 'completed' })
    expect(dismissed.response).toMatchObject({ status: 'completed' })
    expect(handoff.response).toMatchObject({ status: 'completed' })
    expect(data.weekly_reflections[0]).toMatchObject({
      status: 'converted_to_coach',
    })
    expect(data.weekly_reflections[0].viewed_at).toBeTruthy()
    expect(data.weekly_reflections[0].dismissed_at).toBeTruthy()
    expect(data.weekly_reflections[0].converted_to_coach_at).toBeTruthy()
  })

  it('blocks cross-user lifecycle actions from touching another user reflection', async () => {
    const data = baseData()
    const client = fakeClient(data)
    await handleWeeklyReflectionRequest({
      client,
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'generate_weekly_reflection' },
    })
    const reflectionId = String(data.weekly_reflections[0].id)
    const attackerUserId = '00000000-0000-4000-8000-000000000999'
    data.ai_internal_testers.push({ user_id: attackerUserId, enabled: true, consent_granted: true })
    data.user_ai_preferences.push({ user_id: attackerUserId, ai_coaching_enabled: true })

    await expect(handleWeeklyReflectionRequest({
      client,
      env: { ENABLE_WEEKLY_REFLECTION: 'true' },
      userId: attackerUserId,
      now: new Date('2026-07-12T20:30:00.000Z'),
      body: { action: 'dismiss_reflection', reflectionId },
    })).rejects.toThrow()
    expect(data.weekly_reflections[0].status).toBe('generated')
    expect(data.weekly_reflections[0].dismissed_at).toBeNull()
  })
})

function baseData(options: { weeklyFlagEnabled?: boolean } = {}): Record<string, Array<Record<string, unknown>>> {
  const weeklyFlagEnabled = options.weeklyFlagEnabled ?? true
  return {
    ai_internal_testers: [{ user_id: userId, enabled: true, consent_granted: true }],
    user_ai_preferences: [{ user_id: userId, ai_coaching_enabled: true }],
    ai_feature_flags: [{ feature_name: 'ENABLE_WEEKLY_REFLECTION', enabled: weeklyFlagEnabled }],
    profiles: [{ id: userId, timezone: 'Asia/Kolkata' }],
    nuraa_scores: [
      score('2026-07-13', 76),
      score('2026-07-12', 72),
      score('2026-07-11', 70),
      score('2026-07-06', 66),
    ],
    score_factors: [
      factors('2026-07-13', 84, 55),
      factors('2026-07-12', 80, 60),
      factors('2026-07-11', 82, 58),
      factors('2026-07-06', 72, 50),
    ],
    health_signals: [{ id: '00000000-0000-4000-8000-000000000201', user_id: userId, signal_date: '2026-07-13' }],
    daily_briefs: [{ id: '00000000-0000-4000-8000-000000000301', user_id: userId, brief_date: '2026-07-13', headline: 'Steady week' }],
    insight_events: [{ id: '00000000-0000-4000-8000-000000000501', user_id: userId, event_date: '2026-07-13', title: 'Stress was elevated', description: 'Stress was the lowest weekly factor.' }],
    user_goals: [{ id: '00000000-0000-4000-8000-000000000601', user_id: userId, status: 'active', priority: 1 }],
    proactive_card_feedback: [],
    daily_checkins: ['2026-07-13', '2026-07-12', '2026-07-11', '2026-07-10'].map((date) => ({ id: crypto.randomUUID(), user_id: userId, checkin_date: date })),
    weekly_reflections: [],
  }
}

function score(date: string, totalScore: number) {
  return { id: crypto.randomUUID(), user_id: userId, score_date: date, total_score: totalScore, readiness_category: totalScore >= 70 ? 'Ready' : 'Steady' }
}

function factors(date: string, sleepScore: number, stressScore: number) {
  return { id: crypto.randomUUID(), user_id: userId, score_date: date, sleep_score: sleepScore, stress_score: stressScore, recovery_score: 72, activity_score: 70, nutrition_score: 70, hydration_score: 68, confidence: 70 }
}

function fakeClient(data: Record<string, Array<Record<string, unknown>>>): WeeklyReflectionSupabaseClient {
  return {
    from(table: string) {
      let filters: Array<{ column: string; value: unknown; op: 'eq' | 'gte' | 'lte' }> = []
      let limitCount: number | null = null
      let pendingWrite: { type: 'upsert' | 'update'; values: Record<string, unknown> } | null = null
      const builder = {
        select: () => builder,
        insert: (values: unknown) => {
          writeRows(Array.isArray(values) ? values : [values])
          return builder
        },
        update: (values: unknown) => {
          pendingWrite = { type: 'update', values: values as Record<string, unknown> }
          return builder
        },
        upsert: (values: unknown) => {
          pendingWrite = { type: 'upsert', values: values as Record<string, unknown> }
          return builder
        },
        delete: () => builder,
        eq: (column: string, value: unknown) => {
          filters = [...filters, { column, value, op: 'eq' }]
          return builder
        },
        in: () => builder,
        gte: (column: string, value: unknown) => {
          filters = [...filters, { column, value, op: 'gte' }]
          return builder
        },
        lte: (column: string, value: unknown) => {
          filters = [...filters, { column, value, op: 'lte' }]
          return builder
        },
        lt: () => builder,
        order: () => builder,
        limit: (count: number) => {
          limitCount = count
          return builder
        },
        maybeSingle: async () => ({ data: applyPendingWrite()[0] ?? null, error: null }),
        single: async () => ({ data: applyPendingWrite()[0], error: null }),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: applyPendingWrite(), error: null })),
      }
      function applyPendingWrite() {
        if (pendingWrite?.type === 'upsert') {
          const existing = data[table]?.find((row) => row.user_id === pendingWrite?.values.user_id && row.week_start_date === pendingWrite?.values.week_start_date && row.week_end_date === pendingWrite?.values.week_end_date)
          if (existing) Object.assign(existing, pendingWrite.values)
          else writeRows([{ id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...pendingWrite.values }])
          pendingWrite = null
        }
        if (pendingWrite?.type === 'update') {
          for (const row of rows()) Object.assign(row, pendingWrite.values)
          pendingWrite = null
        }
        return rows()
      }
      function rows() {
        const filtered = applyFilters(data[table] ?? [], filters)
        return limitCount === null ? filtered : filtered.slice(0, limitCount)
      }
      function writeRows(values: unknown[]) {
        data[table] = [...(data[table] ?? []), ...values.map((value) => ({ id: crypto.randomUUID(), ...(value as Record<string, unknown>) }))]
      }
      return builder
    },
  } as unknown as WeeklyReflectionSupabaseClient
}

function applyFilters(rows: Array<Record<string, unknown>>, filters: Array<{ column: string; value: unknown; op: 'eq' | 'gte' | 'lte' }>) {
  return rows.filter((row) => filters.every((filter) => {
    if (filter.op === 'gte') return String(row[filter.column]) >= String(filter.value)
    if (filter.op === 'lte') return String(row[filter.column]) <= String(filter.value)
    return row[filter.column] === filter.value
  }))
}
