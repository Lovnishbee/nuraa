import { getSupabaseClient } from '@/lib/supabase'
import { getAIInternalAccessStatus, invokeAIGateway } from '@/services/aiGateway'
import type { AIDetailLevel, AIGatewayResponse, CoachResponsePayload } from '@/features/ai/types'
import type { CoachConversation, CoachFeedback, CoachMessage, UserAIPreferences } from '@/types/database'

export type CoachEligibility = {
  internalEnabled: boolean
  internalConsentGranted: boolean
  coachEnabled: boolean
  responseDetail: AIDetailLevel
}

export type CoachMessageView = {
  id: string
  role: 'user' | 'nuraa' | 'system'
  messageType: CoachMessage['message_type']
  content: string
  payload: CoachResponsePayload | null
  createdAt: string
}

export async function getCoachEligibility(): Promise<CoachEligibility> {
  const supabase = getSupabaseClient()
  const access = await getAIInternalAccessStatus()
  const user = await supabase.auth.getUser()
  const userId = user.data.user?.id
  if (!userId) return { internalEnabled: false, internalConsentGranted: false, coachEnabled: false, responseDetail: 'balanced' }
  const preferences = await getCoachPreferences(userId)
  return {
    internalEnabled: access.enabled,
    internalConsentGranted: access.consentGranted,
    coachEnabled: Boolean(preferences?.ai_coaching_enabled),
    responseDetail: preferences?.response_detail ?? 'balanced',
  }
}

export async function getCoachPreferences(userId: string): Promise<UserAIPreferences | null> {
  const result = await getSupabaseClient()
    .from('user_ai_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<UserAIPreferences>()
  if (result.error) return null
  return result.data
}

export async function setCoachConsent(userId: string, enabled: boolean, responseDetail: AIDetailLevel = 'balanced') {
  const now = new Date().toISOString()
  const result = await getSupabaseClient().from('user_ai_preferences').upsert({
    user_id: userId,
    ai_coaching_enabled: enabled,
    ai_coaching_policy_version: enabled ? 'phase4b.v1' : null,
    ai_coaching_consented_at: enabled ? now : null,
    ai_coaching_disabled_at: enabled ? null : now,
    response_detail: responseDetail,
  }, { onConflict: 'user_id' }).select('*').single<UserAIPreferences>()
  if (result.error) throw result.error
  return result.data
}

export async function updateCoachResponseDetail(userId: string, responseDetail: AIDetailLevel) {
  const result = await getSupabaseClient().from('user_ai_preferences')
    .upsert({ user_id: userId, response_detail: responseDetail }, { onConflict: 'user_id' })
    .select('*')
    .single<UserAIPreferences>()
  if (result.error) throw result.error
  return result.data
}

export async function listCoachConversations(userId: string): Promise<CoachConversation[]> {
  const result = await getSupabaseClient().from('coach_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_active_at', { ascending: false })
    .limit(10)
  if (result.error) throw result.error
  return (result.data ?? []).filter((conversation) => !conversation.deleted_at) as CoachConversation[]
}

export async function getCoachMessages(conversationId: string): Promise<CoachMessageView[]> {
  const result = await getSupabaseClient().from('coach_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sequence_number', { ascending: true })
  if (result.error) throw result.error
  return ((result.data ?? []) as CoachMessage[]).map(toCoachMessageView)
}

export async function startAskAboutToday(detailLevel: AIDetailLevel): Promise<AIGatewayResponse> {
  return invokeAIGateway({
    taskType: 'ask_about_today',
    entryPoint: 'dashboard_ask_today',
    detailLevel,
    idempotencyKey: `ask_${crypto.randomUUID()}`,
  })
}

export async function startScoreExplanation(detailLevel: AIDetailLevel): Promise<AIGatewayResponse> {
  return invokeAIGateway({
    taskType: 'explain_score',
    entryPoint: 'dashboard_score',
    detailLevel,
    idempotencyKey: `score_${crypto.randomUUID()}`,
  })
}

export async function startCoachHome(detailLevel: AIDetailLevel): Promise<AIGatewayResponse> {
  return invokeAIGateway({
    taskType: 'ask_about_today',
    entryPoint: 'coach_home',
    detailLevel,
    idempotencyKey: `coach_home_${crypto.randomUUID()}`,
  })
}

export async function sendCoachFollowUp(conversationId: string, question: string, detailLevel: AIDetailLevel): Promise<AIGatewayResponse> {
  return invokeAIGateway({
    taskType: 'coach_follow_up',
    entryPoint: 'coach_follow_up',
    conversationId,
    detailLevel,
    userInput: { question },
    idempotencyKey: `follow_${crypto.randomUUID()}`,
  })
}

export async function archiveCoachConversation(conversationId: string) {
  const now = new Date().toISOString()
  const result = await getSupabaseClient().from('coach_conversations').update({
    status: 'archived',
    archived_at: now,
    last_active_at: now,
  }).eq('id', conversationId)
  if (result.error) throw result.error
}

export async function deleteCoachConversation(conversationId: string) {
  const now = new Date().toISOString()
  const result = await getSupabaseClient().from('coach_conversations').update({
    status: 'deleted',
    deleted_at: now,
    last_active_at: now,
  }).eq('id', conversationId)
  if (result.error) throw result.error
}

export async function createCoachFeedback(values: {
  userId: string
  conversationId: string
  messageId: string
  feedbackType: CoachFeedback['feedback_type']
}) {
  const result = await getSupabaseClient().from('coach_feedback').insert({
    user_id: values.userId,
    conversation_id: values.conversationId,
    message_id: values.messageId,
    feedback_type: values.feedbackType,
  })
  if (result.error) throw result.error
}

export function payloadToCoachMessage(response: AIGatewayResponse): CoachMessageView {
  const payload = response.payload && typeof response.payload === 'object' ? response.payload as CoachResponsePayload : null
  return {
    id: response.requestId,
    role: 'nuraa',
    messageType: response.status === 'safety_routed' ? 'safety_response' : response.fallbackUsed ? 'fallback' : response.taskType === 'explain_score' ? 'score_explanation' : response.taskType === 'ask_about_today' ? 'coach_opening' : 'coach_follow_up',
    content: payload ? [payload.headline, payload.summary].filter(Boolean).join('\n\n') : 'Nuraa guidance is unavailable.',
    payload,
    createdAt: new Date().toISOString(),
  }
}

function toCoachMessageView(message: CoachMessage): CoachMessageView {
  const payload = message.structured_payload && typeof message.structured_payload === 'object' ? message.structured_payload as CoachResponsePayload : null
  return {
    id: message.id,
    role: message.role,
    messageType: message.message_type,
    content: message.content ?? (payload ? [payload.headline, payload.summary].filter(Boolean).join('\n\n') : ''),
    payload,
    createdAt: message.created_at,
  }
}
