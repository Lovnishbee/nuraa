import { describe, expect, it } from 'vitest'
import { evaluateFeatureAccess } from './feature-flags.ts'
import type { RuntimeSupabaseClient } from './types.ts'

describe('feature flag evaluation', () => {
  it('requires env flag, DB flag, internal tester status, and consent', async () => {
    const result = await evaluateFeatureAccess({
      client: fakeClient({
        ai_feature_flags: [
          { feature_name: 'AI_ENABLED', enabled: true },
          { feature_name: 'ENABLE_AI_INTERNAL_TESTS', enabled: true },
          { feature_name: 'ENABLE_AI_DAILY_BRIEF', enabled: true },
        ],
        ai_internal_testers: [{ user_id: 'user-1', enabled: true, consent_granted: true }],
      }),
      env: { AI_ENABLED: 'true', ENABLE_AI_INTERNAL_TESTS: 'true', ENABLE_AI_DAILY_BRIEF: 'true' },
      userId: 'user-1',
      input: { taskType: 'rewrite_daily_brief', entryPoint: 'internal_dev' },
    })

    expect(result.enabled).toBe(true)
  })

  it('blocks when consent is missing', async () => {
    const result = await evaluateFeatureAccess({
      client: fakeClient({
        ai_feature_flags: [
          { feature_name: 'AI_ENABLED', enabled: true },
          { feature_name: 'ENABLE_AI_INTERNAL_TESTS', enabled: true },
          { feature_name: 'ENABLE_AI_DAILY_BRIEF', enabled: true },
        ],
        ai_internal_testers: [{ user_id: 'user-1', enabled: true, consent_granted: false }],
      }),
      env: { AI_ENABLED: 'true', ENABLE_AI_INTERNAL_TESTS: 'true', ENABLE_AI_DAILY_BRIEF: 'true' },
      userId: 'user-1',
      input: { taskType: 'rewrite_daily_brief', entryPoint: 'internal_dev' },
    })

    expect(result).toEqual({ enabled: false, reason: 'consent_missing' })
  })

  it('requires internal tester access outside the dev entrypoint when the runtime is internal-only', async () => {
    const result = await evaluateFeatureAccess({
      client: fakeClient({
        ai_feature_flags: [
          { feature_name: 'AI_ENABLED', enabled: true },
          { feature_name: 'ENABLE_AI_DAILY_BRIEF', enabled: true },
        ],
      }),
      env: { AI_ENABLED: 'true', ENABLE_AI_DAILY_BRIEF: 'true', AI_INTERNAL_ACCESS_REQUIRED: 'true' },
      userId: 'user-1',
      input: { taskType: 'rewrite_daily_brief', entryPoint: 'future_dashboard' },
    })

    expect(result).toEqual({ enabled: false, reason: 'not_internal_tester' })
  })
})

function fakeClient(data: Record<string, Array<Record<string, unknown>>>): RuntimeSupabaseClient {
  return {
    from(table: string) {
      let rows = data[table] ?? []
      const builder = {
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        upsert: () => builder,
        delete: () => builder,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value)
          return builder
        },
        in: () => builder,
        gte: () => builder,
        lt: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        single: async () => ({ data: rows[0], error: null }),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: rows, error: null })),
      }
      return builder
    },
  } as unknown as RuntimeSupabaseClient
}
