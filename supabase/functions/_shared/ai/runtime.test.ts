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

  it('allows a consented product Coach entrypoint without an internal tester row', async () => {
    const data = baseEnabledData({ testers: [] })
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: { ...envForTask('ask_about_today'), ENABLE_AI_COACH: 'true', ENABLE_AI_COACH_DASHBOARD_ENTRY: 'true' },
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: { taskType: 'ask_about_today', entryPoint: 'dashboard_ask_today', idempotencyKey: 'product_without_tester' },
      provider,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response.status).toBe('completed')
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
    expect(data.context_requests).toHaveLength(1)
    expect(data.ai_executions.at(-1)?.status).toBe('completed')
  })

  it.each([
    ['future_dashboard'],
    ['future_coach'],
  ] as const)('blocks %s before feature lookup or runtime writes', async (entryPoint) => {
    const data = baseEnabledData()
    const provider = providerWithPayload(payloadForTask('ask_about_today'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('ask_about_today'),
      userId,
      body: { taskType: 'ask_about_today', entryPoint },
      provider,
    })

    expect(result.response.status).toBe('disabled')
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

  it('starts Coach from an actual user-owned proactive card context', async () => {
    const data = baseEnabledData()
    const provider = providerWithPayload(payloadForTask('coach_from_card'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('coach_from_card'),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: {
        taskType: 'coach_from_card',
        entryPoint: 'proactive_card_to_coach',
        cardId: '00000000-0000-4000-8000-000000000701',
        idempotencyKey: 'card-to-coach-test',
      },
      provider,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response.status).toBe('completed')
    expect(result.response.conversationId).toBeTruthy()
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
    expect(data.coach_conversations.at(-1)?.entry_point).toBe('proactive_card_to_coach')
    expect(data.coach_conversations.at(-1)?.initial_task_type).toBe('coach_from_card')
    expect(data.context_items.some((item) => item.category === 'proactive_card' && item.source_reference_id === '00000000-0000-4000-8000-000000000701')).toBe(true)
    expect(data.coach_messages.at(-1)?.task_type).toBe('coach_from_card')
    expect(data.coach_messages.at(-1)?.source_references).toContain('proactive_card:00000000-0000-4000-8000-000000000701')
  })

  it('persists a bounded Coach follow-up turn on an active user-owned conversation', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000901',
      user_id: userId,
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'active',
      deterministic_title: 'Today’s guidance',
      latest_context_envelope_id: null,
      last_context_at: null,
      last_active_at: '2026-06-29T13:55:00.000Z',
      archived_at: null,
      deleted_at: null,
    })
    data.coach_messages.push({
      id: '00000000-0000-4000-8000-000000000904',
      conversation_id: '00000000-0000-4000-8000-000000000901',
      user_id: userId,
      sequence_number: 1,
      role: 'nuraa',
      task_type: 'ask_about_today',
      message_type: 'coach_opening',
      content: 'Keep today simple.',
      structured_payload: null,
      source_references: [],
      validation_status: 'valid',
      client_request_key: null,
      ai_execution_id: null,
      created_at: '2026-06-29 13:55:00.000+00',
    })
    const provider = providerWithPayload(payloadForTask('coach_follow_up'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('coach_follow_up'),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: {
        taskType: 'coach_follow_up',
        entryPoint: 'coach_follow_up',
        conversationId: '00000000-0000-4000-8000-000000000901',
        userInput: { question: 'What should I prioritise today?' },
        idempotencyKey: 'follow-up-test',
      },
      provider,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response.status).toBe('completed')
    expect(result.response.conversationId).toBe('00000000-0000-4000-8000-000000000901')
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
    expect(data.coach_messages.at(-2)?.role).toBe('user')
    expect(data.coach_messages.at(-2)?.content).toBe('What should I prioritise today?')
    expect(data.coach_messages.at(-1)?.role).toBe('nuraa')
    expect(data.coach_messages.at(-1)?.task_type).toBe('coach_follow_up')
  })

  it('accepts a follow-up on a paused non-archived Coach conversation', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000903',
      user_id: userId,
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'paused',
      deterministic_title: 'Today’s guidance',
      latest_context_envelope_id: null,
      last_context_at: null,
      last_active_at: '2026-06-29T13:55:00.000Z',
      archived_at: null,
      deleted_at: null,
    })
    const provider = providerWithPayload(payloadForTask('coach_follow_up'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('coach_follow_up'),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: {
        taskType: 'coach_follow_up',
        entryPoint: 'coach_follow_up',
        conversationId: '00000000-0000-4000-8000-000000000903',
        userInput: { question: 'What should I prioritise today?' },
        idempotencyKey: 'follow-up-paused-test',
      },
      provider,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response.status).toBe('completed')
    expect(result.response.fallbackUsed).toBe(false)
    expect(result.response.conversationId).toBe('00000000-0000-4000-8000-000000000903')
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
    expect(data.coach_messages.at(-2)?.role).toBe('user')
    expect(data.coach_messages.at(-1)?.task_type).toBe('coach_follow_up')
  })

  it('keeps follow-up responses available when Coach message append fails', async () => {
    const data = baseEnabledData()
    data.coach_conversations.push({
      id: '00000000-0000-4000-8000-000000000902',
      user_id: userId,
      entry_point: 'coach_home',
      initial_task_type: 'ask_about_today',
      status: 'active',
      deterministic_title: 'Today’s guidance',
      latest_context_envelope_id: null,
      last_context_at: null,
      last_active_at: '2026-06-29T13:55:00.000Z',
      archived_at: null,
      deleted_at: null,
    })
    const provider = providerWithPayload(payloadForTask('coach_follow_up'))

    const result = await handleAIGatewayRequest({
      client: fakeClientWithRpcError(data, 'CONVERSATION_NOT_ACTIVE'),
      env: envForTask('coach_follow_up'),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: {
        taskType: 'coach_follow_up',
        entryPoint: 'coach_follow_up',
        conversationId: '00000000-0000-4000-8000-000000000902',
        userInput: { question: 'What should I prioritise today?' },
        idempotencyKey: 'follow-up-rpc-failure-test',
      },
      provider,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response.status).toBe('completed')
    expect(result.response.fallbackUsed).toBe(false)
    expect(result.response.conversationId).toBe('00000000-0000-4000-8000-000000000902')
    expect(result.response.safeMeta.schemaValidationPassed).toBe(true)
    expect(provider.generateStructured).toHaveBeenCalledTimes(1)
    expect(data.ai_executions.at(-1)?.status).toBe('completed')
    expect(data.coach_messages).toHaveLength(0)
  })

  it('blocks card-to-Coach before context creation when the handoff flag is disabled', async () => {
    const data = baseEnabledData()
    const flag = data.ai_feature_flags.find((row) => row.feature_name === 'ENABLE_CARD_TO_COACH')
    if (flag) flag.enabled = false
    const provider = providerWithPayload(payloadForTask('coach_from_card'))

    const result = await handleAIGatewayRequest({
      client: fakeClient(data),
      env: envForTask('coach_from_card'),
      userId,
      now: new Date('2026-06-29T14:00:00.000Z'),
      body: {
        taskType: 'coach_from_card',
        entryPoint: 'proactive_card_to_coach',
        cardId: '00000000-0000-4000-8000-000000000701',
      },
      provider,
    })

    expect(result.httpStatus).toBe(200)
    expect(result.response.status).toBe('disabled')
    expect(provider.generateStructured).not.toHaveBeenCalled()
    expect(data.context_requests).toHaveLength(0)
    expect(data.context_envelopes).toHaveLength(0)
    expect(data.coach_conversations).toHaveLength(0)
    expect(data.ai_executions).toHaveLength(0)
  })
})

function envForTask(taskType: TaskType): Record<string, string | undefined> {
  return {
    AI_ENABLED: 'true',
    ENABLE_AI_INTERNAL_TESTS: 'true',
    ENABLE_AI_DAILY_BRIEF: taskType === 'rewrite_daily_brief' ? 'true' : undefined,
    ENABLE_AI_SCORE_EXPLANATION: taskType === 'explain_score' ? 'true' : undefined,
    ENABLE_AI_ASK_ABOUT_TODAY: taskType === 'ask_about_today' ? 'true' : undefined,
    ENABLE_AI_COACH: taskType === 'coach_from_card' || taskType === 'coach_follow_up' ? 'true' : undefined,
    ENABLE_CARD_TO_COACH: taskType === 'coach_from_card' ? 'true' : undefined,
    AI_INTERNAL_ACCESS_REQUIRED: 'true',
    AI_RATE_LIMIT_MAX_REQUESTS: '10',
    AI_RATE_LIMIT_WINDOW_SECONDS: '60',
    AI_PROVIDER_DEFAULT: 'fake',
  }
}

function baseEnabledData(options: { testers?: Array<Record<string, unknown>> } = {}): Record<string, Array<Record<string, unknown>>> {
  return {
    ai_feature_flags: [
      { feature_name: 'AI_ENABLED', enabled: true },
      { feature_name: 'ENABLE_AI_INTERNAL_TESTS', enabled: true },
      { feature_name: 'ENABLE_AI_DAILY_BRIEF', enabled: true },
      { feature_name: 'ENABLE_AI_SCORE_EXPLANATION', enabled: true },
      { feature_name: 'ENABLE_AI_ASK_ABOUT_TODAY', enabled: true },
      { feature_name: 'ENABLE_AI_COACH', enabled: true },
      { feature_name: 'ENABLE_AI_COACH_DASHBOARD_ENTRY', enabled: true },
      { feature_name: 'ENABLE_CARD_TO_COACH', enabled: true },
    ],
    ai_internal_testers: options.testers ?? [{ user_id: userId, enabled: true, consent_granted: true }],
    user_ai_preferences: [{ user_id: userId, ai_coaching_enabled: true, response_detail: 'balanced' }],
    prompt_contracts: [
      { id: 'contract-brief', name: 'rewrite_daily_brief', version: 'phase4a.v1', task_type: 'rewrite_daily_brief' },
      { id: 'contract-score', name: 'explain_score', version: 'phase4a.v1', task_type: 'explain_score' },
      { id: 'contract-today', name: 'ask_about_today', version: 'phase4a.v1', task_type: 'ask_about_today' },
      { id: 'contract-follow-up', name: 'coach_follow_up', version: 'phase4b.v1', task_type: 'coach_follow_up' },
      { id: 'contract-card', name: 'coach_from_card', version: 'phase4b.v1', task_type: 'coach_from_card' },
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
    proactive_cards: [{
      id: '00000000-0000-4000-8000-000000000701',
      user_id: userId,
      candidate_id: '00000000-0000-4000-8000-000000000702',
      health_date: '2026-06-29',
      card_type: 'opportunity',
      category: 'hydration',
      severity: 'low',
      title: 'Hydrate earlier today',
      body: 'Your recent pattern suggests water intake is the simplest focus.',
      primary_action_label: 'Keep water visible',
      primary_action_type: 'habit',
      primary_action_payload: { detail: 'Place a bottle near your desk.' },
      evidence_refs: [{ label: 'Hydration signal', explanation: 'Hydration was a relevant factor.', sourceReference: 'score_factors:00000000-0000-4000-8000-000000000401' }],
      confidence_score: 72,
      confidence_label: 'moderate',
      status: 'active',
      source_engine_version: 'phase-v-b.v1',
      copy_source: 'deterministic',
    }],
    coach_conversations: [],
    coach_messages: [],
    context_requests: [],
    context_envelopes: [],
    context_items: [],
    ai_executions: [],
    ai_responses: [],
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
  if (taskType === 'coach_from_card') {
    return {
      headline: 'Hydrate earlier today',
      summary: 'This card is pointing to hydration because it is the safest practical focus available from your current deterministic context.',
      factualBasis: [
        { label: 'Proactive card', sourceReference: 'proactive_card:00000000-0000-4000-8000-000000000701' },
        { label: 'Score factors', sourceReference: 'score_factors:00000000-0000-4000-8000-000000000401' },
      ],
      interpretations: [{ statement: 'Hydration is a practical lever today.', confidence: 'moderate' }],
      primaryAction: { title: 'Keep water visible', detail: 'Place a bottle near your desk.' },
      clarificationQuestion: null,
      suggestedPrompts: ['Why is this card showing today?'],
      confidenceNote: 'Based on deterministic Nuraa context.',
      sourceReferences: ['proactive_card:00000000-0000-4000-8000-000000000701', 'score_factors:00000000-0000-4000-8000-000000000401'],
    }
  }
  if (taskType === 'coach_follow_up') {
    return {
      headline: 'Prioritise one steady action',
      summary: 'Given today’s context, keep the plan practical and low-friction.',
      factualBasis: [{ label: 'Current score', sourceReference: 'score:00000000-0000-4000-8000-000000000101' }],
      interpretations: [{ statement: 'A simple action is more useful than adding intensity today.', confidence: 'moderate' }],
      primaryAction: { title: 'Take a breathing break', detail: 'Use two quiet minutes before your next demanding block.' },
      clarificationQuestion: null,
      suggestedPrompts: ['What is one simple action I can take?'],
      confidenceNote: 'Based on deterministic Nuraa context.',
      sourceReferences: ['score:00000000-0000-4000-8000-000000000101'],
    }
  }
  return {
    headline: 'Focus on one steady action',
    summary: 'Today looks suitable for a calm, consistent routine.',
    primaryFocus: { title: 'Hydrate steadily', detail: 'Keep water nearby and check in later.' },
    factualBasis: [{ label: 'Daily brief', sourceReference: 'daily_brief:00000000-0000-4000-8000-000000000301' }],
    suggestedPrompts: ['Why is this my focus today?'],
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
      const builder = {
        select: () => builder,
        insert: (values: unknown) => {
          const records = Array.isArray(values) ? values : [values]
          for (const value of records) {
            const record: Record<string, unknown> = { id: crypto.randomUUID(), ...(value as Record<string, unknown>) }
            if (table === 'ai_executions' && !record.started_at) record.started_at = new Date('2026-06-29T14:00:00.000Z').toISOString()
            if (table === 'ai_responses' && !record.created_at) record.created_at = new Date('2026-06-29T14:00:00.000Z').toISOString()
            if (table === 'context_envelopes' && !record.expires_at) record.expires_at = new Date('2026-06-29T14:15:00.000Z').toISOString()
            if (table === 'coach_messages' && !record.created_at) record.created_at = new Date('2026-06-29T14:00:00.000Z').toISOString()
            data[table] = [...(data[table] ?? []), record]
          }
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
        const filtered = applyFilters(data[table] ?? [], filters)
        return limitCount === null ? filtered : filtered.slice(0, limitCount)
      }
      return builder
    },
  } as unknown as RuntimeSupabaseClient
}

function fakeClientWithRpcError(data: Record<string, Array<Record<string, unknown>>>, message: string): RuntimeSupabaseClient {
  return {
    ...fakeClient(data),
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message } }),
  } as unknown as RuntimeSupabaseClient
}

function applyFilters(rows: Array<Record<string, unknown>>, filters: Array<{ column: string; value: unknown; op: 'eq' | 'gte' }>) {
  return rows.filter((row) => filters.every((filter) => {
    if (filter.op === 'gte') return String(row[filter.column]) >= String(filter.value)
    return row[filter.column] === filter.value
  }))
}
