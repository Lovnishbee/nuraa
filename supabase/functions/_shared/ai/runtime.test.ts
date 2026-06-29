import { describe, expect, it, vi } from 'vitest'
import { handleAIGatewayRequest } from './runtime.ts'
import type { AIProvider } from './providers/provider.interface.ts'
import type { RuntimeSupabaseClient } from './types.ts'

const userId = '00000000-0000-4000-8000-000000000001'
const promptContract = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'ask_about_today',
  version: 'phase4a.v1',
  task_type: 'ask_about_today',
}

describe('AI gateway runtime', () => {
  it('returns disabled without calling the provider when AI is globally disabled', async () => {
    const provider = fakeProvider()
    const result = await handleAIGatewayRequest({
      client: fakeClient({ ai_feature_flags: [{ feature_name: 'AI_ENABLED', enabled: false }] }),
      env: { AI_ENABLED: 'false' },
      userId,
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev' },
      provider,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response.status).toBe('disabled')
    expect(provider.generateStructured).not.toHaveBeenCalled()
  })

  it('safety routes S1 requests and persists a validated response without calling the provider', async () => {
    const data = baseEnabledData()
    const provider = fakeProvider()
    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: baseEnabledEnv(),
      userId,
      body: {
        taskType: 'ask_about_today',
        entryPoint: 'internal_dev',
        userInput: { question: 'Can you diagnose my symptoms?' },
        idempotencyKey: 'safety_test_1',
      },
      provider,
    })

    expect(result.response.status).toBe('safety_routed')
    expect(result.response.safeMeta.schemaValidationPassed).toBe(true)
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.ai_executions[0].status).toBe('safety_routed')
    expect(data.ai_responses).toHaveLength(1)
  })

  it('rate limits before provider execution', async () => {
    const data = baseEnabledData()
    data.ai_executions = Array.from({ length: 10 }, (_, index) => ({
      id: `execution-${index}`,
      user_id: userId,
      task_type: 'ask_about_today',
      started_at: '2026-06-29T14:00:00.000Z',
    }))
    const provider = fakeProvider()

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: baseEnabledEnv(),
      userId,
      now: new Date('2026-06-29T14:00:30.000Z'),
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev' },
      provider,
    })

    expect(result.httpStatus).toBe(429)
    expect(result.response.payload).toEqual({ errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Unable to complete this AI runtime request safely.' })
    expect(provider.generateStructured).not.toHaveBeenCalled()
  })
})

function baseEnabledEnv() {
  return {
    AI_ENABLED: 'true',
    ENABLE_AI_INTERNAL_TESTS: 'true',
    ENABLE_AI_ASK_ABOUT_TODAY: 'true',
    AI_INTERNAL_ACCESS_REQUIRED: 'true',
    AI_RATE_LIMIT_MAX_REQUESTS: '10',
    AI_RATE_LIMIT_WINDOW_SECONDS: '60',
  }
}

function baseEnabledData(): Record<string, Array<Record<string, unknown>>> {
  return {
    ai_feature_flags: [
      { feature_name: 'AI_ENABLED', enabled: true },
      { feature_name: 'ENABLE_AI_INTERNAL_TESTS', enabled: true },
      { feature_name: 'ENABLE_AI_ASK_ABOUT_TODAY', enabled: true },
    ],
    ai_internal_testers: [{ user_id: userId, enabled: true, consent_granted: true }],
    prompt_contracts: [promptContract],
    ai_executions: [],
    ai_responses: [],
  }
}

function fakeProvider(): AIProvider {
  return {
    generateStructured: vi.fn(),
    healthCheck: vi.fn(),
  } as unknown as AIProvider
}

function fakeClient(data: Record<string, Array<Record<string, unknown>>>): RuntimeSupabaseClient {
  return {
    from(table: string) {
      let rows = data[table] ?? []
      let filters: Array<{ column: string; value: unknown; op: 'eq' | 'gte' }> = []
      const builder = {
        select: () => builder,
        insert: (values: unknown) => {
          const records = Array.isArray(values) ? values : [values]
          for (const value of records) {
            const record = { id: crypto.randomUUID(), ...(value as Record<string, unknown>) }
            if (table === 'ai_executions' && !record.started_at) record.started_at = new Date('2026-06-29T14:00:00.000Z').toISOString()
            if (table === 'ai_responses' && !record.created_at) record.created_at = new Date('2026-06-29T14:00:00.000Z').toISOString()
            data[table] = [...(data[table] ?? []), record]
            rows = data[table]
          }
          return builder
        },
        update: (values: unknown) => {
          rows = applyFilters(data[table] ?? [], filters)
          for (const row of rows) Object.assign(row, values)
          return builder
        },
        upsert: () => builder,
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
        lt: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: applyFilters(rows, filters)[0] ?? null, error: null }),
        single: async () => ({ data: applyFilters(rows, filters)[0], error: null }),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: applyFilters(rows, filters), error: null })),
      }
      return builder
    },
  } as unknown as RuntimeSupabaseClient
}

function applyFilters(rows: Array<Record<string, unknown>>, filters: Array<{ column: string; value: unknown; op: 'eq' | 'gte' }>) {
  return rows.filter((row) => filters.every((filter) => {
    if (filter.op === 'gte') return String(row[filter.column]) >= String(filter.value)
    return row[filter.column] === filter.value
  }))
}
