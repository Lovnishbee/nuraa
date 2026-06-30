import { getRuntimeConfig, readEnvValue } from './config.ts'
import { getJsonSchemaForTask, getResponseSchemaName } from './contracts.ts'
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
import { FakeAIProvider } from './providers/fake.provider.ts'
import { OpenAIResponsesProvider } from './providers/openai-responses.provider.ts'
import type { AIProvider } from './providers/provider.interface.ts'
import type { AIGatewayResponse, AIResponsePayload, RuntimeEnv, RuntimeResult, RuntimeSupabaseClient } from './types.ts'

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
  if (input.entryPoint !== 'internal_dev') {
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

  const context = await buildContextEnvelope({ client: options.client, userId: options.userId, input, now: options.now })
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
    return {
      httpStatus: 200,
      response: safeResponse({
        requestId,
        taskType: input.taskType,
        status: 'completed',
        fallbackUsed: false,
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
    return {
      httpStatus: 200,
      response: safeResponse({
        requestId,
        taskType: input.taskType,
        status: 'fallback',
        fallbackUsed: true,
        contextExpiresAt: context.expiresAt,
        payload: fallback,
        safeMeta: { responseSchemaVersion: 'phase4a.v1', promptContractVersion: prompt.promptContractVersion, schemaValidationPassed: true },
      }),
    }
  }
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
