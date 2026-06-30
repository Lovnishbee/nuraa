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
  if (result.data.status === 'deleted' || result.data.deleted_at) return null
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
    .select('role, message_type, content, structured_payload, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('sequence_number', { ascending: false })
    .limit(limit)
  if (result.error || !Array.isArray(result.data)) return []
  return [...result.data].reverse() as Array<{
    role: 'user' | 'nuraa'
    message_type: string
    content: string | null
    structured_payload: unknown | null
    created_at: string
  }>
}

export async function persistCoachUserMessage(client: RuntimeSupabaseClient, values: {
  userId: string
  conversationId: string
  taskType: TaskType
  content: string
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
  })
}

export async function persistCoachNuraaMessage(client: RuntimeSupabaseClient, values: {
  userId: string
  conversationId: string
  taskType: TaskType
  messageType: 'coach_opening' | 'score_explanation' | 'coach_follow_up' | 'safety_response' | 'fallback'
  payload: AIResponsePayload
  validationStatus?: string
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
}) {
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
  }).select('id, sequence_number, created_at').single<{ id: string; sequence_number: number; created_at: string }>()
  if (result.error) throw new Error(result.error.message)
  return result.data
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
