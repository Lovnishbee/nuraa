import { describe, expect, it, vi } from 'vitest'
import { handleAIGatewayRequest } from './runtime.ts'
import type { AIProvider } from './providers/provider.interface.ts'
import type { AIResponsePayload, RuntimeSupabaseClient, TaskType } from './types.ts'

const userId = '00000000-0000-4000-8000-000000000001'
const contextEnvelopeId = '00000000-0000-4000-8000-000000000777'

describe('AI gateway runtime hardening', () => {
  it.each<TaskType>(['rewrite_daily_brief', 'explain_score', 'ask_about_today'])('allows an enabled consented internal tester to run %s', async (taskType) => {
    const data = baseEnabledData()
    const provider = providerWithPayload(payloadForTask(taskType))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask(taskType),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: { taskType, entryPoint: 'internal_dev', idempotencyKey: `allowed_${taskType}` },
      provider,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response.status).toBe('completed')
    expect(result.response.fallbackUsed).toBe(false)
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
    expect(data.context_requests).toHaveLength(1)
    expect(data.context_envelopes).toHaveLength(1)
    expect(data.ai_executions.at(-1)?.status).toBe('completed')
  })

  it.each([
    ['missing tester row', []],
    ['disabled tester', [{ user_id: userId, enabled: false, consent_granted: true }]],
    ['missing consent', [{ user_id: userId, enabled: true, consent_granted: false }]],
  ])('blocks %s before context, provider, or runtime writes', async (_label, testerRows) => {
    const data = baseEnabledData({ testers: testerRows })
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('ask_about_today'),
      userId,
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev' },
      provider,
    })

    expect(result.response.status).toBe('disabled')
    expect(result.response.payload).toEqual({
      headline: 'This feature is not available.',
      summary: 'Nuraa’s core health insights are still available.',
    })
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.context_requests).toHaveLength(0)
    expect(data.context_envelopes).toHaveLength(0)
    expect(data.ai_executions).toHaveLength(0)
    expect(data.ai_responses).toHaveLength(0)
  })

  it.each([
    ['future_dashboard'],
    ['future_coach'],
  ] as const)('rejects %s before feature lookup or runtime writes', async (entryPoint) => {
    const data = baseEnabledData()
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('ask_about_today'),
      userId,
      body: { taskType: 'ask_about_today', entryPoint },
      provider,
    })

    expect(result.httpStatus).toBe(400)
    expect(result.response.status).toBe('fallback')
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.context_requests).toHaveLength(0)
    expect(data.ai_executions).toHaveLength(0)
  })

  it.each([
    ['AI_ENABLED false', { AI_ENABLED: 'false' }],
    ['internal test flag off', { ENABLE_AI_INTERNAL_TESTS: 'false' }],
    ['task flag missing', { ENABLE_AI_ASK_ABOUT_TODAY: undefined }],
    ['task flag false', { ENABLE_AI_ASK_ABOUT_TODAY: 'false' }],
  ])('fails closed when %s', async (_label, envOverride) => {
    const data = baseEnabledData()
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: { ...envForTask('ask_about_today'), ...envOverride },
      userId,
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev' },
      provider,
    })

    expect(result.response.status).toBe('disabled')
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.context_requests).toHaveLength(0)
    expect(data.ai_executions).toHaveLength(0)
  })

  it.each([
    ['S1', 'Can you diagnose my symptoms?'],
    ['S2', 'My pain is persistent and worsening.'],
    ['S3', 'I have chest pain and cannot breathe.'],
  ])('routes %s safety input without normal provider execution', async (_route, question) => {
    const data = baseEnabledData()
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('ask_about_today'),
      userId,
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev', userInput: { question } },
      provider,
    })

    expect(result.response.status).toBe('safety_routed')
    expect(result.response.safeMeta.schemaValidationPassed).toBe(true)
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.context_requests).toHaveLength(0)
    expect(data.ai_executions.at(-1)?.status).toBe('safety_routed')
  })

  it.each([
    ['provider throws', providerThatThrows('PROVIDER_TIMEOUT')],
    ['invalid structured output', providerWithPayload({ headline: 'Missing required fields' })],
    ['invalid source reference', providerWithPayload({ ...payloadForTask('ask_about_today'), sourceReferences: ['unknown:ref'], factualBasis: [{ label: 'Unknown', sourceReference: 'unknown:ref' }] })],
  ])('returns deterministic fallback when %s', async (_label, provider) => {
    const data = baseEnabledData()

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('ask_about_today'),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev' },
      provider,
    })

    expect(result.response.status).toBe('fallback')
    expect(result.response.safeMeta.schemaValidationPassed).toBe(true)
    expect(data.ai_executions.at(-1)?.status).toBe('fallback')
    expect(data.ai_responses).toHaveLength(1)
  })

  it('returns deterministic fallback when the OpenAI key is missing', async () => {
    const data = baseEnabledData()

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: { ...envForTask('ask_about_today'), AI_PROVIDER_DEFAULT: 'openai', AI_MODEL_FAST_STRUCTURED: 'model-test', OPENAI_API_KEY: undefined },
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev' },
    })

    expect(result.response.status).toBe('fallback')
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
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('ask_about_today'),
      userId,
      now: new Date('2026-06-29T14:00:30.000Z'),
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev' },
      provider,
    })

    expect(result.httpStatus).toBe(429)
    expect(result.response.payload).toEqual({ errorCode: 'RATE_LIMIT_EXCEEDED', message: 'Unable to complete this AI runtime request safely.' })
    expect(provider.generateStructured).not.toHaveBeenCalled()
  })

  it('replays a completed idempotent response without provider execution', async () => {
    const data = baseEnabledData()
    data.context_envelopes = [{ id: contextEnvelopeId, expires_at: '2026-06-29T14:30:00.000Z' }]
    data.ai_executions.push({
      id: 'existing-execution',
      user_id: userId,
      task_type: 'ask_about_today',
      idempotency_key: 'same-key',
      status: 'completed',
      fallback_used: false,
      safety_route: 'S0_routine_wellness',
      completed_at: '2026-06-29T14:00:00.000Z',
      context_envelope_id: contextEnvelopeId,
    })
    data.ai_responses.push({
      ai_execution_id: 'existing-execution',
      schema_version: 'phase4a.v1',
      validated_payload: payloadForTask('ask_about_today'),
    })
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('ask_about_today'),
      userId,
      now: new Date('2026-06-29T14:05:00.000Z'),
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev', idempotencyKey: 'same-key' },
      provider,
    })

    expect(result.response.status).toBe('completed')
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.ai_executions).toHaveLength(1)
  })

  it('does not reuse an idempotent response after its context expires', async () => {
    const data = baseEnabledData()
    data.context_envelopes = [{ id: contextEnvelopeId, expires_at: '2026-06-29T13:00:00.000Z' }]
    data.ai_executions.push({
      id: 'expired-execution',
      user_id: userId,
      task_type: 'ask_about_today',
      idempotency_key: 'expired-key',
      status: 'completed',
      fallback_used: false,
      safety_route: 'S0_routine_wellness',
      completed_at: '2026-06-29T13:00:00.000Z',
      context_envelope_id: contextEnvelopeId,
    })
    data.ai_responses.push({
      ai_execution_id: 'expired-execution',
      schema_version: 'phase4a.v1',
      validated_payload: payloadForTask('ask_about_today'),
    })
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('ask_about_today'),
      userId,
      now: new Date('2026-06-29T14:05:00.000Z'),
      body: { taskType: 'ask_about_today', entryPoint: 'internal_dev', idempotencyKey: 'expired-key' },
      provider,
    })

    expect(result.response.status).toBe('completed')
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
    expect(data.ai_executions).toHaveLength(2)
    expect(data.ai_executions.at(-1)?.idempotency_key).toBeNull()
  })

  it('blocks public Coach requests when AI Coach consent is missing before runtime writes', async () => {
    const data = baseEnabledData({ aiPreferences: [] })
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForPublicCoachTask('ask_about_today'),
      userId,
      body: { taskType: 'ask_about_today', entryPoint: 'dashboard_ask_today' },
      provider,
    })

    expect(result.response.status).toBe('disabled')
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.coach_conversations).toHaveLength(0)
    expect(data.context_requests).toHaveLength(0)
    expect(data.ai_executions).toHaveLength(0)
  })

  it('creates a Coach conversation and Nuraa opening for dashboard Ask About Today', async () => {
    const data = baseEnabledData()
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForPublicCoachTask('ask_about_today'),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: { taskType: 'ask_about_today', entryPoint: 'dashboard_ask_today' },
      provider,
    })

    expect(result.response.status).toBe('completed')
    expect(result.response.conversationId).toBe(data.coach_conversations[0].id)
    expect(result.response.messageId).toBe(data.coach_messages[0].id)
    expect(data.coach_conversations).toHaveLength(1)
    expect(data.coach_messages).toHaveLength(1)
    expect(data.coach_messages[0]).toMatchObject({ role: 'nuraa', message_type: 'coach_opening', validation_status: 'valid' })
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
  })

  it('pauses an existing active conversation when starting fresh', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000704',
      user_id: userId,
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'active',
      deterministic_title: 'Previous conversation',
      deleted_at: null,
      archived_at: null,
    })
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForPublicCoachTask('ask_about_today'),
      userId,
      body: { taskType: 'ask_about_today', entryPoint: 'coach_home' },
      provider,
    })

    expect(result.response.status).toBe('completed')
    expect(data.coach_conversations[0].status).toBe('paused')
    expect(data.coach_conversations).toHaveLength(2)
    expect(result.response.conversationId).not.toBe('00000000-0000-4000-8000-000000000704')
  })

  it('persists a user follow-up and validated Nuraa response with fresh context', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000701',
      user_id: userId,
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'active',
      deterministic_title: 'Today’s guidance',
      deleted_at: null,
      archived_at: null,
    })
    const provider = providerWithPayload(payloadForTask('coach_follow_up'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForPublicCoachTask('coach_follow_up'),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: {
        taskType: 'coach_follow_up',
        entryPoint: 'coach_follow_up',
        conversationId: '00000000-0000-4000-8000-000000000701',
        userInput: { question: 'What should I prioritise?' },
      },
      provider,
    })

    expect(result.response.status).toBe('completed')
    expect(data.context_requests).toHaveLength(1)
    expect(data.context_envelopes).toHaveLength(1)
    expect(data.coach_messages).toHaveLength(2)
    expect(data.coach_messages[0]).toMatchObject({ role: 'user', content: 'What should I prioritise?' })
    expect(data.coach_messages[1]).toMatchObject({ role: 'nuraa', message_type: 'coach_follow_up' })
    expect(result.response.messageId).toBe(data.coach_messages[1].id)
  })

  it('replays a Coach follow-up without duplicating user or Nuraa messages', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000705',
      user_id: userId,
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'active',
      deterministic_title: 'Today’s guidance',
      deleted_at: null,
      archived_at: null,
    })
    const provider = providerWithPayload(payloadForTask('coach_follow_up'))
    const body = {
      taskType: 'coach_follow_up' as const,
      entryPoint: 'coach_follow_up' as const,
      conversationId: '00000000-0000-4000-8000-000000000705',
      userInput: { question: 'What should I prioritise?' },
      idempotencyKey: 'follow_same_request',
    }

    const first = await handleAIGatewayRequest({ client: fakeClient(data), env: envForPublicCoachTask('coach_follow_up'), userId, now: new Date('2026-06-29T14:00:00.000Z'), body, provider })
    const second = await handleAIGatewayRequest({ client: fakeClient(data), env: envForPublicCoachTask('coach_follow_up'), userId, now: new Date('2026-06-29T14:01:00.000Z'), body, provider })

    expect(first.response.messageId).toBe(second.response.messageId)
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
    expect(data.coach_messages).toHaveLength(2)
    expect(data.coach_messages.filter((message) => message.role === 'user')).toHaveLength(1)
    expect(data.coach_messages.filter((message) => message.role === 'nuraa')).toHaveLength(1)
  })

  it('blocks follow-ups to archived conversations before provider execution', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000706',
      user_id: userId,
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'archived',
      deterministic_title: 'Archived',
      deleted_at: null,
      archived_at: '2026-06-29T14:00:00.000Z',
    })
    const provider = providerWithPayload(payloadForTask('coach_follow_up'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForPublicCoachTask('coach_follow_up'),
      userId,
      body: {
        taskType: 'coach_follow_up',
        entryPoint: 'coach_follow_up',
        conversationId: '00000000-0000-4000-8000-000000000706',
        userInput: { question: 'What should I prioritise?' },
      },
      provider,
    })

    expect(result.httpStatus).toBe(404)
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.coach_messages).toHaveLength(0)
  })

  it('blocks cross-user follow-up conversations', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000702',
      user_id: '00000000-0000-4000-8000-000000009999',
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'active',
      deterministic_title: 'Other user',
      deleted_at: null,
      archived_at: null,
    })
    const provider = providerWithPayload(payloadForTask('coach_follow_up'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForPublicCoachTask('coach_follow_up'),
      userId,
      body: {
        taskType: 'coach_follow_up',
        entryPoint: 'coach_follow_up',
        conversationId: '00000000-0000-4000-8000-000000000702',
        userInput: { question: 'What should I prioritise?' },
      },
      provider,
    })

    expect(result.httpStatus).toBe(404)
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.coach_messages).toHaveLength(0)
  })

  it('suppresses normal provider execution and raw user-message persistence for S3 Coach turns', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000703',
      user_id: userId,
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'active',
      deterministic_title: 'Today’s guidance',
      deleted_at: null,
      archived_at: null,
    })
    const provider = providerWithPayload(payloadForTask('coach_follow_up'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForPublicCoachTask('coach_follow_up'),
      userId,
      body: {
        taskType: 'coach_follow_up',
        entryPoint: 'coach_follow_up',
        conversationId: '00000000-0000-4000-8000-000000000703',
        userInput: { question: 'I have chest pain and cannot breathe.' },
      },
      provider,
    })

    expect(result.response.status).toBe('safety_routed')
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.coach_messages).toHaveLength(1)
    expect(data.coach_messages[0]).toMatchObject({ role: 'nuraa', message_type: 'safety_response' })
    expect(data.coach_messages[0].content).not.toContain('chest pain')
  })
})

function envForTask(taskType: TaskType): Record<string, string | undefined> {
  return {
    AI_ENABLED: 'true',
    ENABLE_AI_INTERNAL_TESTS: 'true',
    ENABLE_AI_DAILY_BRIEF: taskType === 'rewrite_daily_brief' ? 'true' : undefined,
    ENABLE_AI_SCORE_EXPLANATION: taskType === 'explain_score' ? 'true' : undefined,
    ENABLE_AI_ASK_ABOUT_TODAY: taskType === 'ask_about_today' ? 'true' : undefined,
    AI_INTERNAL_ACCESS_REQUIRED: 'true',
    AI_RATE_LIMIT_MAX_REQUESTS: '10',
    AI_RATE_LIMIT_WINDOW_SECONDS: '60',
    AI_PROVIDER_DEFAULT: 'fake',
  }
}

function envForPublicCoachTask(taskType: TaskType): Record<string, string | undefined> {
  return {
    ...envForTask(taskType),
    ENABLE_AI_COACH: 'true',
    ENABLE_AI_COACH_DASHBOARD_ENTRY: 'true',
    ENABLE_AI_ASK_ABOUT_TODAY: taskType === 'ask_about_today' ? 'true' : undefined,
    ENABLE_AI_SCORE_EXPLANATION: taskType === 'explain_score' ? 'true' : undefined,
  }
}

function baseEnabledData(options: { testers?: Array<Record<string, unknown>>; aiPreferences?: Array<Record<string, unknown>> } = {}): Record<string, Array<Record<string, unknown>>> {
  return {
    ai_feature_flags: [
      { feature_name: 'AI_ENABLED', enabled: true },
      { feature_name: 'ENABLE_AI_INTERNAL_TESTS', enabled: true },
      { feature_name: 'ENABLE_AI_DAILY_BRIEF', enabled: true },
      { feature_name: 'ENABLE_AI_SCORE_EXPLANATION', enabled: true },
      { feature_name: 'ENABLE_AI_ASK_ABOUT_TODAY', enabled: true },
      { feature_name: 'ENABLE_AI_COACH', enabled: true },
      { feature_name: 'ENABLE_AI_COACH_DASHBOARD_ENTRY', enabled: true },
      { feature_name: 'ENABLE_AI_COACH_HISTORY', enabled: true },
      { feature_name: 'ENABLE_AI_COACH_FEEDBACK', enabled: true },
    ],
    ai_internal_testers: options.testers ?? [{ user_id: userId, enabled: true, consent_granted: true }],
    user_ai_preferences: options.aiPreferences ?? [{ user_id: userId, ai_coaching_enabled: true, response_detail: 'balanced' }],
    prompt_contracts: [
      { id: 'contract-brief', name: 'rewrite_daily_brief', version: 'phase4a.v1', task_type: 'rewrite_daily_brief' },
      { id: 'contract-score', name: 'explain_score', version: 'phase4a.v1', task_type: 'explain_score' },
      { id: 'contract-today', name: 'ask_about_today', version: 'phase4a.v1', task_type: 'ask_about_today' },
      { id: 'contract-coach', name: 'coach_follow_up', version: 'phase4b.v1', task_type: 'coach_follow_up' },
    ],
    ai_model_policies: [
      { id: 'policy-fast', alias: 'nuraa_fast_structured', model_env_key: 'AI_MODEL_FAST_STRUCTURED', status: 'active' },
      { id: 'policy-coach', alias: 'nuraa_coach_balanced', model_env_key: 'AI_MODEL_COACH_BALANCED', status: 'active' },
    ],
    profiles: [{ id: userId, timezone: 'Asia/Kolkata', full_name: 'Internal Tester' }],
    nuraa_scores: [
      { id: '00000000-0000-4000-8000-000000000101', user_id: userId, score_date: '2026-06-29', total_score: 78, readiness_category: 'Ready', score_reason: 'Sleep and recovery are steady.', recommended_focus: 'Keep today simple.', confidence: 70 },
      { id: '00000000-0000-4000-8000-000000000102', user_id: userId, score_date: '2026-06-28', total_score: 72, readiness_category: 'Ready' },
    ],
    health_signals: [{ id: '00000000-0000-4000-8000-000000000201', user_id: userId, signal_date: '2026-06-29', overall_signal_confidence: 70 }],
    daily_briefs: [{ id: '00000000-0000-4000-8000-000000000301', user_id: userId, brief_date: '2026-06-29', headline: 'A steady day', summary: 'Your routine looks stable.', focus_items: [{ title: 'Hydrate steadily', description: 'Keep water nearby.', category: 'hydration' }] }],
    score_factors: [{ id: '00000000-0000-4000-8000-000000000401', user_id: userId, score_date: '2026-06-29', sleep_score: 80, stress_score: 72, recovery_score: 75, activity_score: 70, nutrition_score: 70, hydration_score: 70 }],
    insight_events: [{ id: '00000000-0000-4000-8000-000000000501', user_id: userId, event_date: '2026-06-29', title: 'Hydrate steadily', recommendation: 'Keep water nearby.', category: 'hydration' }],
    user_goals: [{ id: '00000000-0000-4000-8000-000000000601', user_id: userId, goal_label: 'Improve Energy', priority: 1, status: 'active' }],
    context_requests: [],
    context_envelopes: [],
    context_items: [],
    ai_executions: [],
    ai_responses: [],
    coach_conversations: [],
    coach_messages: [],
    coach_feedback: [],
  }
}

function payloadForTask(taskType: TaskType): AIResponsePayload {
  if (taskType === 'rewrite_daily_brief') {
    return {
      headline: 'A steady day',
      summary: 'Your routine looks stable and your focus can stay simple.',
      primaryAction: { title: 'Hydrate steadily', detail: 'Keep water nearby.' },
      confidenceNote: 'Based on deterministic Nuraa context.',
      sourceReferences: ['daily_brief:00000000-0000-4000-8000-000000000301'],
    }
  }
  if (taskType === 'explain_score') {
    return {
      headline: '78 · Ready',
      summary: 'Your score reflects steady sleep, recovery, and baseline factors.',
      factualBasis: [
        { label: 'Current score', sourceReference: 'score:00000000-0000-4000-8000-000000000101' },
        { label: 'Score factors', sourceReference: 'score_factors:00000000-0000-4000-8000-000000000401' },
      ],
      interpretations: [{ statement: 'Sleep and recovery are supporting your day.', confidence: 'moderate' }],
      primaryAction: { title: 'Keep today simple', detail: 'Protect one steady routine.' },
      confidenceNote: 'Based on deterministic Nuraa context.',
      followUpQuestions: ['What should I focus on today?'],
      sourceReferences: ['score:00000000-0000-4000-8000-000000000101', 'score_factors:00000000-0000-4000-8000-000000000401'],
    }
  }
  if (taskType === 'ask_about_today') return {
    headline: 'Focus on one steady action',
    summary: 'Today looks suitable for a calm, consistent routine.',
    primaryFocus: { title: 'Hydrate steadily', detail: 'Keep water nearby and check in later.' },
    factualBasis: [{ label: 'Daily brief', sourceReference: 'daily_brief:00000000-0000-4000-8000-000000000301' }],
    suggestedPrompts: ['Why is this my focus today?'],
    confidenceNote: 'Based on deterministic Nuraa context.',
    sourceReferences: ['daily_brief:00000000-0000-4000-8000-000000000301'],
  }
  return {
    headline: 'Prioritise the simplest useful action',
    summary: 'Based on today’s deterministic Nuraa context, a calm hydration focus is the most practical next step.',
    factualBasis: [{ label: 'Daily brief', sourceReference: 'daily_brief:00000000-0000-4000-8000-000000000301' }],
    interpretations: [{ statement: 'A small steady action fits today’s readiness.', confidence: 'moderate' }],
    primaryAction: { title: 'Hydrate steadily', detail: 'Keep water nearby and check in later.' },
    clarificationQuestion: null,
    suggestedPrompts: ['Why this focus?', 'Should I take it lighter today?'],
    confidenceNote: 'Based on deterministic Nuraa context.',
    sourceReferences: ['daily_brief:00000000-0000-4000-8000-000000000301'],
  }
}

function providerWithPayload(payload: unknown): AIProvider {
  return {
    generateStructured: vi.fn().mockResolvedValue({
      parsed: payload,
      providerRequestId: 'provider-test',
      usage: { inputTokens: 1, outputTokens: 1 },
      latencyMs: 1,
    }),
    healthCheck: vi.fn(),
  } as unknown as AIProvider
}

function providerThatThrows(code: string): AIProvider {
  return {
    generateStructured: vi.fn().mockRejectedValue(new Error(code)),
    healthCheck: vi.fn(),
  } as unknown as AIProvider
}

function fakeClient(data: Record<string, Array<Record<string, unknown>>>): RuntimeSupabaseClient {
  return {
    from(table: string) {
      let filters: Array<{ column: string; value: unknown; op: 'eq' | 'gte' }> = []
      let limitCount: number | null = null
      let insertedRows: Array<Record<string, unknown>> | null = null
      const builder = {
        select: () => builder,
        insert: (values: unknown) => {
          const records = Array.isArray(values) ? values : [values]
          const nextInsertedRows: Array<Record<string, unknown>> = []
          for (const value of records) {
            const record: Record<string, unknown> = { id: crypto.randomUUID(), ...(value as Record<string, unknown>) }
            if (table === 'ai_executions' && !record.started_at) record.started_at = new Date('2026-06-29T14:00:00.000Z').toISOString()
            if (table === 'ai_responses' && !record.created_at) record.created_at = new Date('2026-06-29T14:00:00.000Z').toISOString()
            if (table === 'context_envelopes' && !record.expires_at) record.expires_at = new Date('2026-06-29T14:15:00.000Z').toISOString()
            if (table === 'coach_messages' && !record.created_at) record.created_at = new Date('2026-06-29T14:00:00.000Z').toISOString()
            data[table] = [...(data[table] ?? []), record]
            nextInsertedRows.push(record)
          }
          insertedRows = nextInsertedRows
          return builder
        },
        update: (values: unknown) => {
          for (const row of applyFilters(data[table] ?? [], filters)) Object.assign(row, values)
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
        limit: (count: number) => {
          limitCount = count
          return builder
        },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        single: async () => ({ data: rows()[0], error: null }),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: rows(), error: null })),
      }
      function rows() {
        if (insertedRows) return insertedRows
        const filtered = applyFilters(data[table] ?? [], filters)
        return limitCount === null ? filtered : filtered.slice(0, limitCount)
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
