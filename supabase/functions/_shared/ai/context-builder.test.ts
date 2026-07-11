import { describe, expect, it } from 'vitest'
import { buildContextEnvelope } from './context-builder.ts'
import type { RuntimeSupabaseClient } from './types.ts'

const userId = '00000000-0000-4000-8000-000000000001'

describe('context builder privacy boundaries', () => {
  it('uses only scoped Phase 3 tables and never queries raw check-in reflections', async () => {
    const calls: Array<{ table: string; filters: Array<{ column: string; value: unknown }> }> = []
    const client = fakeClient(calls)

    await buildContextEnvelope({
      client,
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      input: { taskType: 'ask_about_today', entryPoint: 'internal_dev' },
    })

    expect(calls.some((call) => call.table === 'daily_checkins')).toBe(false)
    for (const call of calls.filter((item) => ['profiles', 'nuraa_scores', 'health_signals', 'daily_briefs', 'score_factors', 'insight_events', 'user_goals'].includes(item.table))) {
      const scopeColumn = call.table === 'profiles' ? 'id' : 'user_id'
      expect(call.filters.some((filter) => filter.column === scopeColumn && filter.value === userId)).toBe(true)
    }
  })
})

function fakeClient(calls: Array<{ table: string; filters: Array<{ column: string; value: unknown }> }>): RuntimeSupabaseClient {
  const data: Record<string, Array<Record<string, unknown>>> = {
    profiles: [{ id: userId, timezone: 'Asia/Kolkata', full_name: 'Tester' }],
    nuraa_scores: [{ id: '00000000-0000-4000-8000-000000000101', user_id: userId, score_date: '2026-06-29', total_score: 78, readiness_category: 'Ready', confidence: 70 }],
    health_signals: [{ id: '00000000-0000-4000-8000-000000000201', user_id: userId, signal_date: '2026-06-29', overall_signal_confidence: 70 }],
    daily_briefs: [{ id: '00000000-0000-4000-8000-000000000301', user_id: userId, brief_date: '2026-06-29', headline: 'Steady day', summary: 'Keep it simple.', focus_items: [] }],
    score_factors: [{ id: '00000000-0000-4000-8000-000000000401', user_id: userId, score_date: '2026-06-29', sleep_score: 80 }],
    insight_events: [],
    user_goals: [],
    context_requests: [],
    context_envelopes: [],
    context_items: [],
  }

  return {
    from(table: string) {
      const filters: Array<{ column: string; value: unknown }> = []
      const builder = {
        select: () => builder,
        insert: (values: unknown) => {
          const records = Array.isArray(values) ? values : [values]
          data[table] = [...(data[table] ?? []), ...records.map((value) => ({ id: crypto.randomUUID(), ...(value as Record<string, unknown>) }))]
          return builder
        },
        update: () => builder,
        upsert: () => builder,
        delete: () => builder,
        eq: (column: string, value: unknown) => {
          filters.push({ column, value })
          return builder
        },
        in: () => builder,
        gte: () => builder,
        lt: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          calls.push({ table, filters: [...filters] })
          return { data: rows()[0] ?? null, error: null }
        },
        single: async () => {
          calls.push({ table, filters: [...filters] })
          return { data: rows()[0], error: null }
        },
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => {
          calls.push({ table, filters: [...filters] })
          return Promise.resolve(resolve({ data: rows(), error: null }))
        },
      }
      function rows() {
        return (data[table] ?? []).filter((row) => filters.every((filter) => row[filter.column] === filter.value))
      }
      return builder
    },
  } as unknown as RuntimeSupabaseClient
}
