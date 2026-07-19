import { getRuntimeConfig, readEnvValue } from './config.ts'
import { getJsonSchemaForTask, getResponseSchemaName, getSchemaVersionForTask } from './contracts.ts'
import { buildContextEnvelope } from './context-builder.ts'
import { buildFallback } from './fallback-service.ts'
import { evaluateFeatureAccess } from './feature-flags.ts'
import { sha256Hex, stableJsonHash } from './hash.ts'
import { assemblePrompt } from './prompt-orchestrator.ts'
import { checkRateLimit } from './rate-limit.ts'
import { finishAuditExecution, startAuditExecution } from './audit-service.ts'
import { findIdempotentResponse, getModelPolicy, getPromptContractRow } from './repositories/ai-runtime.repository.ts'
import { routeSafety } from './safety-router.ts'
import { parseTaskInput } from './task-router.ts'
import { validateAIResponse } from './response-validator.ts'
import { AIGatewayResponseSchema } from './schemas.ts'
import { createCoachConversation, getCoachConversationForUser, pauseActiveCoachConversations, persistCoachNuraaMessage, persistCoachUserMessage, touchCoachConversationContext } from './repositories/coach.repository.ts'
import { FakeAIProvider } from './providers/fake.provider.ts'
import { OpenAIResponsesProvider } from './providers/openai-responses.provider.ts'
import type { AIProvider } from './providers/provider.interface.ts'
import type { AIGatewayResponse, AIRequestInput, AIResponsePayload, RuntimeEnv, RuntimeResult, RuntimeSupabaseClient } from './types.ts'

export async function handleAIGatewayRequest(options: {
  client: RuntimeSupabaseClient
  env: RuntimeEnv
  userId: string
  body: unknown
  provider?: AIProvider
  now?: Date
}): Promise<RuntimeResult> {
  const parsed = parseTaskInput(options.body)
  if (!parsed.ok) return errorResponse(400, 'invalid-request', 'rewrite_daily_brief', parsed.errorCode)
  const input = parsed.input
  const requestId = crypto.randomUUID()

  try {
    if (input.entryPoint === 'future_dashboard' || input.entryPoint === 'future_coach') {
      return disabledResponse(requestId, input.taskType)
    }
    const featureAccess = await evaluateFeatureAccess({ client: options.client, env: options.env, userId: options.userId, input })
    if (!featureAccess.enabled) {
      return disabledResponse(requestId, input.taskType)
    }

    const runtimeConfig = getRuntimeConfig(options.env)
    const rateLimit = await checkRateLimit({
      client: options.client,
      userId: options.userId,
      windowSeconds: runtimeConfig.rateLimitWindowSeconds,
      maxRequests: runtimeConfig.rateLimitMaxRequests,
      now: options.now,
    })
    if (!rateLimit.allowed) {
      return errorResponse(429, requestId, input.taskType, 'RATE_LIMIT_EXCEEDED')
    }

    const idempotent = await findIdempotentResponse(options.client, { userId: options.userId, taskType: input.taskType, idempotencyKey: input.idempotencyKey, now: options.now })
    const auditIdempotencyKey = idempotent?.state === 'expired' ? undefined : input.idempotencyKey
    if (idempotent?.state === 'found') {
      return {
        httpStatus: 200,
        response: safeResponse({
          requestId,
          taskType: input.taskType,
          status: idempotent.execution.status === 'completed' ? 'completed' : 'fallback',
          fallbackUsed: idempotent.execution.fallback_used,
          payload: idempotent.response.validated_payload,
          safeMeta: { responseSchemaVersion: idempotent.response.schema_version, schemaValidationPassed: true },
        }),
      }
    }

    const promptContractRow = await getPromptContractRow(options.client, input.taskType)
    const safety = routeSafety(input.taskType, input.userInput?.question)
    const requestHash = await stableJsonHash(input)

  if (!safety.shouldCallProvider && safety.response) {
    const execution = await startAuditExecution(options.client, {
      userId: options.userId,
      taskType: input.taskType,
      promptContractId: promptContractRow.id,
      status: 'safety_routed',
      safetyRoute: safety.route,
      fallbackUsed: true,
      idempotencyKey: auditIdempotencyKey,
      requestHash,
    })
    await finishAuditExecution(options.client, {
      executionId: execution.id,
      taskType: input.taskType,
      payload: safety.response,
      status: 'safety_routed',
      fallbackUsed: true,
      latencyMs: 0,
    })
    return {
      httpStatus: 200,
      response: safeResponse({
        requestId,
        taskType: input.taskType,
        status: 'safety_routed',
        fallbackUsed: true,
        payload: safety.response,
        safeMeta: { responseSchemaVersion: 'phase4a.v1', promptContractVersion: promptContractRow.version, schemaValidationPassed: true, latencyMs: 0 },
      }),
    }
  }

  const coachState = await prepareCoachPersistence(options.client, options.userId, input, options.now ?? new Date())
  const contextInput = coachState.conversationId && !input.conversationId ? { ...input, conversationId: coachState.conversationId } : input
  const context = await buildContextEnvelope({ client: options.client, userId: options.userId, input: contextInput, now: options.now })
  if (coachState.conversationId) await touchCoachConversationContext(options.client, coachState.conversationId, context.id, context.createdAt)
  const prompt = assemblePrompt(input, context)
  const modelPolicy = await getModelPolicy(options.client, prompt.modelAlias)
  const execution = await startAuditExecution(options.client, {
    userId: options.userId,
    taskType: input.taskType,
    promptContractId: promptContractRow.id,
    contextEnvelopeId: context.id,
    modelPolicyId: modelPolicy?.id ?? null,
    status: 'started',
    safetyRoute: safety.route,
    fallbackUsed: false,
    idempotencyKey: auditIdempotencyKey,
    requestHash,
  })

  const provider = options.provider ?? createProvider(options.env, modelPolicy)
  const safetyIdentifier = await sha256Hex(`nuraa:${options.userId}`)

  try {
    const providerResult = await provider.generateStructured<AIResponsePayload>({
      modelAlias: prompt.modelAlias,
      instructions: prompt.instructions,
      input: prompt.input,
      responseSchemaName: getResponseSchemaName(input.taskType),
      responseSchema: getJsonSchemaForTask(input.taskType),
      maxOutputTokens: prompt.maxOutputTokens,
      safetyIdentifier,
    })
    const validation = validateAIResponse(input.taskType, providerResult.parsed, context)
    if (!validation.ok) throw new Error(validation.errorCode)
    await finishAuditExecution(options.client, {
      executionId: execution.id,
      taskType: input.taskType,
      payload: validation.payload,
      status: 'completed',
      fallbackUsed: false,
      latencyMs: providerResult.latencyMs,
      inputTokens: providerResult.usage?.inputTokens,
      outputTokens: providerResult.usage?.outputTokens,
    })
    const persistedMessage = await persistCoachResponseIfNeeded(options.client, options.userId, contextInput, validation.payload, validation.schemaVersion, coachState)
    return {
      httpStatus: 200,
      response: safeResponse({
        requestId,
        taskType: input.taskType,
        status: 'completed',
        fallbackUsed: false,
        conversationId: coachState.conversationId ?? undefined,
        messageId: persistedMessage?.id,
        contextExpiresAt: context.expiresAt,
        payload: validation.payload,
        safeMeta: { responseSchemaVersion: validation.schemaVersion, promptContractVersion: prompt.promptContractVersion, schemaValidationPassed: true, latencyMs: providerResult.latencyMs },
      }),
    }
  } catch (error) {
    const fallback = buildFallback(input.taskType, context)
    await finishAuditExecution(options.client, {
      executionId: execution.id,
      taskType: input.taskType,
      payload: fallback,
      status: 'fallback',
      fallbackUsed: true,
      errorCode: error instanceof Error ? error.message : 'AI_PROVIDER_FAILED',
    })
    const persistedMessage = await persistCoachResponseIfNeeded(options.client, options.userId, contextInput, fallback, 'fallback', coachState)
    return {
      httpStatus: 200,
      response: safeResponse({
        requestId,
        taskType: input.taskType,
        status: 'fallback',
        fallbackUsed: true,
        conversationId: coachState.conversationId ?? undefined,
        messageId: persistedMessage?.id,
        contextExpiresAt: context.expiresAt,
        payload: fallback,
        safeMeta: { responseSchemaVersion: getSchemaVersionForTask(input.taskType), promptContractVersion: prompt.promptContractVersion, schemaValidationPassed: true },
      }),
    }
    }
  } catch {
    return runtimeFallbackResponse(requestId, input.taskType, input.conversationId)
  }
}

type CoachPersistenceState = {
  conversationId: string | null
}

const COACH_MESSAGE_PERSIST_TIMEOUT_MS = 2_500

function runtimeFallbackResponse(requestId: string, taskType: AIGatewayResponse['taskType'], conversationId: string | undefined): RuntimeResult {
  return {
    httpStatus: 200,
    response: safeResponse({
      requestId,
      taskType,
      status: 'fallback',
      fallbackUsed: true,
      conversationId,
      payload: fallbackPayloadForTask(taskType),
      safeMeta: {
        responseSchemaVersion: getSchemaVersionForTask(taskType),
        promptContractVersion: 'runtime-fallback',
        schemaValidationPassed: true,
        latencyMs: 0,
      },
    }),
  }
}

function fallbackPayloadForTask(taskType: AIGatewayResponse['taskType']): AIResponsePayload {
  if (taskType === 'rewrite_daily_brief') {
    return {
      headline: 'Your Nuraa brief is still available.',
      summary: 'Nuraa could not complete the live rewrite, so your deterministic daily brief remains the source of truth.',
      primaryAction: { title: 'Use today’s deterministic focus', detail: 'Keep the next useful action small and repeatable.' },
      confidenceNote: 'Live AI was unavailable; deterministic Nuraa context is still active.',
      sourceReferences: ['deterministic:nuraa'],
    }
  }

  if (taskType === 'explain_score') {
    return {
      headline: 'Your deterministic score is still available.',
      summary: 'Nuraa could not complete the live score explanation, so keep using the score and factor cards shown in your dashboard.',
      factualBasis: [{ label: 'Deterministic Nuraa score context', sourceReference: 'deterministic:nuraa' }],
      interpretations: [{ statement: 'The dashboard score remains the source of truth for readiness.', confidence: 'low' }],
      primaryAction: { title: 'Review today’s focus', detail: 'Use the visible daily brief and priorities as your next step.' },
      confidenceNote: 'Live AI was unavailable; deterministic Nuraa context is still active.',
      followUpQuestions: ['What should I prioritise today?'],
      sourceReferences: ['deterministic:nuraa'],
    }
  }

  if (taskType === 'ask_about_today') {
    return {
      headline: 'Use today’s deterministic focus.',
      summary: 'Nuraa could not complete live Coach guidance, but your dashboard brief and priorities are still available.',
      primaryFocus: { title: 'Choose one steady action', detail: 'Pick the smallest visible priority and complete it before adding more.' },
      factualBasis: [{ label: 'Deterministic Nuraa context', sourceReference: 'deterministic:nuraa' }],
      suggestedPrompts: ['What is one simple action I can take?'],
      confidenceNote: 'Live AI was unavailable; deterministic Nuraa context is still active.',
      sourceReferences: ['deterministic:nuraa'],
    }
  }

  if (taskType === 'rewrite_weekly_reflection') {
    return {
      headline: 'Your weekly reflection is still building.',
      weekAtGlance: {
        summary: 'Nuraa could not complete the live reflection rewrite, so deterministic weekly signals remain available.',
        averageScore: null,
        scoreDirection: 'insufficient_data',
        confidence: 'low',
      },
      whatChanged: [],
      whatSupportedYou: [],
      attentionAreas: [{ title: 'Use deterministic weekly signals', explanation: 'Review the available score and check-in coverage while live AI is unavailable.', sourceReference: 'deterministic:nuraa' }],
      nextWeekFocus: { title: 'Keep one steady habit', detail: 'Repeat one useful action next week.' },
      suggestedCoachPrompts: ['What should I focus on next week?'],
      confidenceNote: 'Live AI was unavailable; deterministic Nuraa context is still active.',
      sourceReferences: ['deterministic:nuraa'],
    }
  }

  return {
    headline: 'Keep the next step simple.',
    summary: `Nuraa could not complete the live Coach response (${errorLabel(taskType)}), but deterministic dashboard insights remain available.`,
    factualBasis: [{ label: 'Deterministic Nuraa context', sourceReference: 'deterministic:nuraa' }],
    interpretations: [{ statement: 'A small steady action is the safest useful next step.', confidence: 'low' }],
    primaryAction: { title: 'Use today’s visible focus', detail: 'Complete one small action from your dashboard before adding more.' },
    clarificationQuestion: null,
    suggestedPrompts: ['What should I prioritise today?'],
    confidenceNote: 'Live AI was unavailable; deterministic Nuraa context is still active.',
    sourceReferences: ['deterministic:nuraa'],
  }
}

function errorLabel(taskType: AIGatewayResponse['taskType']) {
  if (taskType === 'coach_from_card') return 'card handoff'
  if (taskType === 'coach_from_weekly_reflection') return 'weekly reflection handoff'
  return 'follow-up'
}

async function prepareCoachPersistence(client: RuntimeSupabaseClient, userId: string, input: AIRequestInput, now: Date): Promise<CoachPersistenceState> {
  if (input.entryPoint === 'internal_dev' || input.entryPoint === 'weekly_reflection') return { conversationId: null }
  const nowIso = now.toISOString()
  if (input.taskType === 'coach_follow_up') {
    const conversation = input.conversationId ? await getCoachConversationForUser(client, input.conversationId, userId) : null
    if (!conversation) throw new Error('COACH_CONVERSATION_NOT_FOUND')
    return { conversationId: conversation.id }
  }
  if (input.taskType === 'ask_about_today' || input.taskType === 'explain_score' || input.taskType === 'coach_from_weekly_reflection' || input.taskType === 'coach_from_card') {
    await pauseActiveCoachConversations(client, userId, nowIso)
    const conversation = await createCoachConversation(client, { userId, entryPoint: input.entryPoint, taskType: input.taskType })
    return { conversationId: conversation.id }
  }
  return { conversationId: null }
}

async function persistCoachResponseIfNeeded(
  client: RuntimeSupabaseClient,
  userId: string,
  input: AIRequestInput,
  payload: AIResponsePayload,
  validationStatus: string,
  coachState: CoachPersistenceState,
) {
  if (!coachState.conversationId) return null
  if (input.taskType === 'coach_follow_up') {
    await persistCoachMessageSafely(persistCoachUserMessage(client, {
      userId,
      conversationId: coachState.conversationId,
      taskType: input.taskType,
      content: input.userInput?.question ?? '',
      clientRequestKey: input.idempotencyKey,
    }))
  }
  const messageType = input.taskType === 'explain_score'
    ? 'score_explanation'
    : input.taskType === 'coach_follow_up'
      ? 'coach_follow_up'
      : 'coach_opening'
  return persistCoachMessageSafely(persistCoachNuraaMessage(client, {
    userId,
    conversationId: coachState.conversationId,
    taskType: input.taskType,
    messageType,
    payload,
    validationStatus: validationStatus === 'fallback' ? 'fallback' : 'valid',
  }))
}

async function persistCoachMessageSafely<T>(operation: Promise<T>): Promise<T | null> {
  try {
    return await withTimeout(operation, COACH_MESSAGE_PERSIST_TIMEOUT_MS)
  } catch {
    // Coach persistence is audit/history support. The validated response should
    // still reach the user when message storage is temporarily slow or blocked.
    return null
  }
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('COACH_MESSAGE_PERSIST_TIMEOUT')), timeoutMs)
    operation.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}

function createProvider(env: RuntimeEnv, modelPolicy: { model_env_key: string } | null): AIProvider {
  if (readEnvValue(env, 'AI_PROVIDER_DEFAULT') === 'fake') return new FakeAIProvider()
  return new OpenAIResponsesProvider(env, (alias) => {
    if (!modelPolicy) return undefined
    if (alias === 'nuraa_fast_structured') return readEnvValue(env, modelPolicy.model_env_key)
    if (alias === 'nuraa_coach_balanced') return readEnvValue(env, modelPolicy.model_env_key)
    return undefined
  })
}

function errorResponse(httpStatus: number, requestId: string, taskType: AIGatewayResponse['taskType'], errorCode: string): RuntimeResult {
  return {
    httpStatus,
    response: safeResponse({
      requestId: /^[0-9a-f-]{36}$/i.test(requestId) ? requestId : crypto.randomUUID(),
      taskType,
      status: 'fallback',
      fallbackUsed: true,
      payload: { errorCode, message: 'Unable to complete this AI runtime request safely.' },
      safeMeta: { responseSchemaVersion: 'phase4a.v1', schemaValidationPassed: false },
    }),
  }
}

function disabledResponse(requestId: string, taskType: AIGatewayResponse['taskType']): RuntimeResult {
  return {
    httpStatus: 200,
    response: safeResponse({
      requestId,
      taskType,
      status: 'disabled',
      fallbackUsed: true,
      payload: {
        headline: 'This feature is not available.',
        summary: 'Nuraa’s core health insights are still available.',
      },
      safeMeta: { responseSchemaVersion: 'phase4a.v1' },
    }),
  }
}

function safeResponse(response: AIGatewayResponse): AIGatewayResponse {
  return AIGatewayResponseSchema.parse(response)
}
