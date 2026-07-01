import type { AIResponsePayload, EntryPoint, RuntimeSupabaseClient, TaskType } from '../types.ts'

export type CoachConversationRow = {
  id: string
  user_id: string
  entry_point: string
  initial_task_type: string
  status: string
  deterministic_title: string | null
  latest_context_envelope_id: string | null
  last_context_at: string | null
  last_active_at: string
  archived_at: string | null
  deleted_at: string | null
}

export async function pauseActiveCoachConversations(client: RuntimeSupabaseClient, userId: string, nowIso: string) {
  const result = await client.from('coach_conversations').update({
    status: 'paused',
    last_active_at: nowIso,
  }).eq('user_id', userId).eq('status', 'active')
  if (result.error) throw new Error(result.error.message)
}

export async function createCoachConversation(client: RuntimeSupabaseClient, values: {
  userId: string
  entryPoint: EntryPoint
  taskType: TaskType
}): Promise<CoachConversationRow> {
  const result = await client.from('coach_conversations').insert({
    user_id: values.userId,
    entry_point: values.entryPoint,
    initial_task_type: values.taskType,
    deterministic_title: deterministicTitle(values.taskType),
    status: 'active',
  }).select('*').single<CoachConversationRow>()
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export async function getCoachConversationForUser(client: RuntimeSupabaseClient, conversationId: string, userId: string): Promise<CoachConversationRow | null> {
  const result = await client.from('coach_conversations').select('*').eq('id', conversationId).eq('user_id', userId).maybeSingle<CoachConversationRow>()
  if (result.error || !result.data) return null
  if (result.data.status !== 'active' || result.data.deleted_at || result.data.archived_at) return null
  return result.data
}

export async function findActiveCoachConversation(client: RuntimeSupabaseClient, values: {
  userId: string
  entryPoint: EntryPoint
  taskType: TaskType
}): Promise<CoachConversationRow | null> {
  const result = await client.from('coach_conversations')
    .select('*')
    .eq('user_id', values.userId)
    .eq('status', 'active')
    .eq('entry_point', values.entryPoint)
    .eq('initial_task_type', values.taskType)
    .order('last_active_at', { ascending: false })
    .limit(1)
    .maybeSingle<CoachConversationRow>()
  if (result.error || !result.data || result.data.deleted_at || result.data.archived_at) return null
  return result.data
}

export async function touchCoachConversationContext(client: RuntimeSupabaseClient, conversationId: string, contextEnvelopeId: string, nowIso: string) {
  const result = await client.from('coach_conversations').update({
    latest_context_envelope_id: contextEnvelopeId,
    last_context_at: nowIso,
    last_active_at: nowIso,
  }).eq('id', conversationId)
  if (result.error) throw new Error(result.error.message)
}

export async function getRecentCoachMessages(client: RuntimeSupabaseClient, conversationId: string, userId: string, limit = 6) {
  const result = await client.from('coach_messages')
    .select('role, message_type, content, structured_payload, created_at, validation_status')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .in('validation_status', ['valid', 'fallback', 'user_visible'])
    .order('sequence_number', { ascending: false })
    .limit(limit)
  if (result.error || !Array.isArray(result.data)) return []
  return [...result.data].reverse() as Array<{
    role: 'user' | 'nuraa'
    message_type: string
    content: string | null
    structured_payload: unknown | null
    created_at: string
    validation_status: string
  }>
}

export async function persistCoachUserMessage(client: RuntimeSupabaseClient, values: {
  userId: string
  conversationId: string
  taskType: TaskType
  content: string
  clientRequestKey?: string
}) {
  return persistCoachMessage(client, {
    userId: values.userId,
    conversationId: values.conversationId,
    role: 'user',
    taskType: values.taskType,
    messageType: 'coach_follow_up',
    content: values.content.slice(0, 500),
    payload: null,
    sourceReferences: [],
    validationStatus: 'user_visible',
    clientRequestKey: values.clientRequestKey,
  })
}

export async function persistCoachNuraaMessage(client: RuntimeSupabaseClient, values: {
  userId: string
  conversationId: string
  taskType: TaskType
  messageType: 'coach_opening' | 'score_explanation' | 'coach_follow_up' | 'safety_response' | 'fallback'
  payload: AIResponsePayload
  validationStatus?: string
  aiExecutionId?: string
}) {
  return persistCoachMessage(client, {
    userId: values.userId,
    conversationId: values.conversationId,
    role: 'nuraa',
    taskType: values.taskType,
    messageType: values.messageType,
    content: payloadToContent(values.payload),
    payload: values.payload,
    sourceReferences: values.payload.sourceReferences,
    validationStatus: values.validationStatus ?? 'valid',
    aiExecutionId: values.aiExecutionId,
  })
}

async function persistCoachMessage(client: RuntimeSupabaseClient, values: {
  userId: string
  conversationId: string
  role: 'user' | 'nuraa'
  taskType: TaskType
  messageType: string
  content: string | null
  payload: unknown | null
  sourceReferences: unknown
  validationStatus: string
  clientRequestKey?: string
  aiExecutionId?: string
}) {
  if (client.rpc) {
    const result = await client.rpc<{ id: string; sequence_number: number; created_at: string }>('append_coach_message', {
      p_user_id: values.userId,
      p_conversation_id: values.conversationId,
      p_role: values.role,
      p_task_type: values.taskType,
      p_message_type: values.messageType,
      p_content: values.content,
      p_structured_payload: values.payload,
      p_source_references: values.sourceReferences,
      p_validation_status: values.validationStatus,
      p_client_request_key: values.clientRequestKey ?? null,
      p_ai_execution_id: values.aiExecutionId ?? null,
    })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) throw new Error('COACH_MESSAGE_APPEND_FAILED')
    return result.data
  }
  const existing = await findExistingCoachMessage(client, values.conversationId, values.role, values.clientRequestKey, values.aiExecutionId)
  if (existing) return existing
  const sequenceNumber = await getNextSequenceNumber(client, values.conversationId)
  const result = await client.from('coach_messages').insert({
    conversation_id: values.conversationId,
    user_id: values.userId,
    sequence_number: sequenceNumber,
    role: values.role,
    task_type: values.taskType,
    message_type: values.messageType,
    content: values.content,
    structured_payload: values.payload,
    source_references: values.sourceReferences,
    validation_status: values.validationStatus,
    client_request_key: values.clientRequestKey ?? null,
    ai_execution_id: values.aiExecutionId ?? null,
  }).select('id, sequence_number, created_at').single<{ id: string; sequence_number: number; created_at: string }>()
  if (result.error) throw new Error(result.error.message)
  return result.data
}

async function findExistingCoachMessage(
  client: RuntimeSupabaseClient,
  conversationId: string,
  role: 'user' | 'nuraa',
  clientRequestKey?: string,
  aiExecutionId?: string,
): Promise<{ id: string; sequence_number: number; created_at: string } | null> {
  if (clientRequestKey) {
    const result = await client.from('coach_messages')
      .select('id, sequence_number, created_at')
      .eq('conversation_id', conversationId)
      .eq('role', role)
      .eq('client_request_key', clientRequestKey)
      .maybeSingle<{ id: string; sequence_number: number; created_at: string }>()
    if (!result.error && result.data) return result.data
  }
  if (aiExecutionId) {
    const result = await client.from('coach_messages')
      .select('id, sequence_number, created_at')
      .eq('ai_execution_id', aiExecutionId)
      .maybeSingle<{ id: string; sequence_number: number; created_at: string }>()
    if (!result.error && result.data) return result.data
  }
  return null
}

async function getNextSequenceNumber(client: RuntimeSupabaseClient, conversationId: string): Promise<number> {
  const result = await client.from('coach_messages')
    .select('sequence_number')
    .eq('conversation_id', conversationId)
    .order('sequence_number', { ascending: false })
    .limit(1)
  if (result.error || !Array.isArray(result.data) || !result.data.length) return 1
  const max = result.data.reduce<number>((highest, row) => {
    const value = Number((row as Record<string, unknown>).sequence_number)
    return Number.isFinite(value) && value > highest ? value : highest
  }, 0)
  return max + 1
}

function deterministicTitle(taskType: TaskType): string {
  if (taskType === 'explain_score') return 'Score explanation'
  if (taskType === 'coach_follow_up') return 'Coach conversation'
  return 'Today’s guidance'
}

function payloadToContent(payload: AIResponsePayload): string {
  const title = 'headline' in payload ? payload.headline : 'Nuraa guidance'
  const summary = 'summary' in payload ? payload.summary : ''
  return [title, summary].filter(Boolean).join('\n\n').slice(0, 1000)
}
