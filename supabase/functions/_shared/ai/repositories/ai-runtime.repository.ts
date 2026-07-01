import { PHASE4B_SCHEMA_VERSION } from '../types.ts'
import type { ModelPolicy, PromptContractRow, RuntimeSupabaseClient, TaskType } from '../types.ts'

export async function getPromptContractRow(client: RuntimeSupabaseClient, taskType: TaskType): Promise<PromptContractRow> {
  const version = taskType === 'coach_follow_up' ? PHASE4B_SCHEMA_VERSION : 'phase4a.v1'
  const result = await client.from('prompt_contracts').select('*').eq('task_type', taskType).eq('version', version).maybeSingle<PromptContractRow>()
  if (result.error || !result.data) throw new Error('PROMPT_CONTRACT_NOT_FOUND')
  return result.data
}

export async function getModelPolicy(client: RuntimeSupabaseClient, alias: string): Promise<ModelPolicy | null> {
  const result = await client.from('ai_model_policies').select('*').eq('alias', alias).eq('status', 'active').maybeSingle<ModelPolicy>()
  if (result.error) return null
  return result.data
}

export async function createContextRequest(client: RuntimeSupabaseClient, values: { userId: string; taskType: TaskType; triggerType: string; featureName: string }): Promise<{ id: string }> {
  const result = await client.from('context_requests').insert({
    user_id: values.userId,
    task_type: values.taskType,
    trigger_type: values.triggerType,
    feature_name: values.featureName,
  }).select('id').single<{ id: string }>()
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export async function createContextEnvelopeMetadata(client: RuntimeSupabaseClient, values: {
  contextRequestId: string
  schemaVersion: string
  contextHash: string
  sensitivityLevel: string
  expiresAt: string
}): Promise<{ id: string }> {
  const result = await client.from('context_envelopes').insert({
    context_request_id: values.contextRequestId,
    schema_version: values.schemaVersion,
    context_hash: values.contextHash,
    sensitivity_level: values.sensitivityLevel,
    expires_at: values.expiresAt,
  }).select('id').single<{ id: string }>()
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export async function createContextItems(client: RuntimeSupabaseClient, contextEnvelopeId: string, items: Array<{ category: string; sourceReferenceId?: string | null; inclusionReason: string; confidence?: number | null }>) {
  if (!items.length) return
  const result = await client.from('context_items').insert(items.map((item) => ({
    context_envelope_id: contextEnvelopeId,
    category: item.category,
    source_reference_id: item.sourceReferenceId ?? null,
    relevance_score: null,
    confidence: item.confidence ?? null,
    freshness_score: null,
    sensitivity_level: 'low',
    inclusion_reason: item.inclusionReason,
  })))
  if (result.error) throw new Error(result.error.message)
}

export type IdempotentResponseLookup =
  | { state: 'found'; execution: { id: string; status: string; fallback_used: boolean; safety_route: string | null; completed_at: string | null; context_envelope_id: string | null; coach_message_id: string | null }; response: { schema_version: string; validated_payload: unknown } }
  | { state: 'expired' }

export async function findIdempotentResponse(client: RuntimeSupabaseClient, values: { userId: string; taskType: TaskType; idempotencyKey?: string; now?: Date }): Promise<IdempotentResponseLookup | null> {
  if (!values.idempotencyKey) return null
  const execution = await client.from('ai_executions').select('id, status, fallback_used, safety_route, completed_at, context_envelope_id, coach_message_id').eq('user_id', values.userId).eq('task_type', values.taskType).eq('idempotency_key', values.idempotencyKey).maybeSingle<{ id: string; status: string; fallback_used: boolean; safety_route: string | null; completed_at: string | null; context_envelope_id: string | null; coach_message_id: string | null }>()
  if (execution.error || !execution.data?.completed_at) return null
  if (execution.data.context_envelope_id) {
    const envelope = await client.from('context_envelopes').select('expires_at').eq('id', execution.data.context_envelope_id).maybeSingle<{ expires_at: string }>()
    if (envelope.error || !envelope.data || envelope.data.expires_at <= (values.now ?? new Date()).toISOString()) return { state: 'expired' }
  }
  const response = await client.from('ai_responses').select('schema_version, validated_payload').eq('ai_execution_id', execution.data.id).maybeSingle<{ schema_version: string; validated_payload: unknown }>()
  if (response.error || !response.data) return null
  return { state: 'found', execution: execution.data, response: response.data }
}

export async function createExecution(client: RuntimeSupabaseClient, values: {
  userId: string
  taskType: TaskType
  promptContractId: string
  contextEnvelopeId?: string | null
  modelPolicyId?: string | null
  status: string
  safetyRoute?: string | null
  fallbackUsed: boolean
  idempotencyKey?: string
  requestHash?: string
}) {
  const result = await client.from('ai_executions').insert({
    user_id: values.userId,
    task_type: values.taskType,
    prompt_contract_id: values.promptContractId,
    context_envelope_id: values.contextEnvelopeId ?? null,
    model_policy_id: values.modelPolicyId ?? null,
    status: values.status,
    safety_route: values.safetyRoute ?? null,
    fallback_used: values.fallbackUsed,
    idempotency_key: values.idempotencyKey ?? null,
    request_hash: values.requestHash ?? null,
  }).select('id, started_at').single<{ id: string; started_at: string }>()
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export async function completeExecution(client: RuntimeSupabaseClient, values: {
  executionId: string
  status: string
  fallbackUsed: boolean
  latencyMs?: number
  inputTokens?: number
  outputTokens?: number
  errorCode?: string | null
  coachMessageId?: string | null
}) {
  const result = await client.from('ai_executions').update({
    status: values.status,
    fallback_used: values.fallbackUsed,
    latency_ms: values.latencyMs ?? null,
    input_token_count: values.inputTokens ?? null,
    output_token_count: values.outputTokens ?? null,
    error_code: values.errorCode ?? null,
    coach_message_id: values.coachMessageId ?? null,
    completed_at: new Date().toISOString(),
  }).eq('id', values.executionId)
  if (result.error) throw new Error(result.error.message)
}

export async function persistValidatedResponse(client: RuntimeSupabaseClient, values: {
  executionId: string
  schemaVersion: string
  payload: unknown
  responseHash: string
}) {
  const result = await client.from('ai_responses').insert({
    ai_execution_id: values.executionId,
    schema_version: values.schemaVersion,
    validated_payload: values.payload,
    validation_status: 'valid',
    response_hash: values.responseHash,
  })
  if (result.error) throw new Error(result.error.message)
}

export async function countRecentExecutions(client: RuntimeSupabaseClient, userId: string, sinceIso: string): Promise<number> {
  const result = await client.from('ai_executions').select('id').eq('user_id', userId).gte('started_at', sinceIso)
  if (result.error) return 0
  return Array.isArray(result.data) ? result.data.length : 0
}
