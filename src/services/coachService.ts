import { getSupabaseClient } from '@/lib/supabase'
import { invokeAuthenticatedFunction } from '@/services/supabaseFunction'
import { invokeAIGateway } from '@/services/aiGateway'
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
  localRequestKey?: string
  conversationId?: string
  role: 'user' | 'nuraa' | 'system'
  messageType: CoachMessage['message_type']
  content: string
  payload: CoachResponsePayload | null
  createdAt: string
}

type CoachControlResponse<T = unknown> = { ok: true } & T
const COACH_FOLLOW_UP_TIMEOUT_MS = 25_000

export async function getCoachEligibility(): Promise<CoachEligibility> {
  const supabase = getSupabaseClient()
  const user = await supabase.auth.getUser()
  const userId = user.data.user?.id
  if (!userId) return { internalEnabled: false, internalConsentGranted: false, coachEnabled: false, responseDetail: 'balanced' }
  const preferences = await getCoachPreferences(userId)
  return {
    // Product Coach access is controlled by authentication, feature flags, and
    // user AI consent. The ai_internal_testers table remains only for /dev tools.
    internalEnabled: true,
    internalConsentGranted: true,
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
  void userId
  const result = await invokeCoachControl<CoachControlResponse<{ preferences: UserAIPreferences }>>({ action: 'set_consent', enabled, responseDetail })
  return result.preferences
}

export async function updateCoachResponseDetail(userId: string, responseDetail: AIDetailLevel) {
  void userId
  const result = await invokeCoachControl<CoachControlResponse<{ preferences: UserAIPreferences }>>({ action: 'set_response_detail', responseDetail })
  return result.preferences
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
  const conversation = await getSupabaseClient().from('coach_conversations')
    .select('id, deleted_at, status')
    .eq('id', conversationId)
    .maybeSingle<{ id: string; deleted_at: string | null; status: string }>()
  if (conversation.error || !conversation.data || conversation.data.deleted_at || conversation.data.status === 'deleted') return []
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

export async function startCoachFromCard(cardId: string, detailLevel: AIDetailLevel): Promise<AIGatewayResponse> {
  return invokeAIGateway({
    taskType: 'coach_from_card',
    entryPoint: 'proactive_card_to_coach',
    cardId,
    detailLevel,
    idempotencyKey: `card_${cardId}_${crypto.randomUUID()}`,
  })
}

export async function sendCoachFollowUp(conversationId: string, question: string, detailLevel: AIDetailLevel, idempotencyKey = `follow_${crypto.randomUUID()}`): Promise<AIGatewayResponse> {
  try {
    return await withTimeout(invokeAIGateway({
      taskType: 'coach_follow_up',
      entryPoint: 'coach_follow_up',
      conversationId,
      detailLevel,
      userInput: { question },
      idempotencyKey,
    }), COACH_FOLLOW_UP_TIMEOUT_MS)
  } catch {
    return buildFollowUpFallback(conversationId)
  }
}

export async function archiveCoachConversation(conversationId: string) {
  await invokeCoachControl({ action: 'archive', conversationId })
}

export async function reopenCoachConversation(conversationId: string) {
  await invokeCoachControl({ action: 'reopen', conversationId })
}

export async function deleteCoachConversation(conversationId: string) {
  await invokeCoachControl({ action: 'delete', conversationId })
}

export async function createCoachFeedback(values: {
  userId: string
  conversationId: string
  messageId: string
  feedbackType: CoachFeedback['feedback_type']
}) {
  void values.userId
  await invokeCoachControl({
    action: 'submit_feedback',
    conversationId: values.conversationId,
    messageId: values.messageId,
    feedbackType: values.feedbackType,
  })
}

export function payloadToCoachMessage(response: AIGatewayResponse): CoachMessageView {
  const payload = response.payload && typeof response.payload === 'object' ? response.payload as CoachResponsePayload : null
  return {
    id: response.messageId ?? response.requestId,
    conversationId: response.conversationId,
    role: 'nuraa',
    messageType: response.status === 'safety_routed' ? 'safety_response' : response.fallbackUsed ? 'fallback' : response.taskType === 'explain_score' ? 'score_explanation' : response.taskType === 'ask_about_today' ? 'coach_opening' : 'coach_follow_up',
    content: payload ? [payload.headline, payload.summary].filter(Boolean).join('\n\n') : 'Nuraa guidance is unavailable.',
    payload,
    createdAt: new Date().toISOString(),
  }
}

async function invokeCoachControl<T = CoachControlResponse>(body: Record<string, unknown>): Promise<T> {
  return invokeAuthenticatedFunction<T>('coach-control', body)
}

function toCoachMessageView(message: CoachMessage): CoachMessageView {
  const payload = message.structured_payload && typeof message.structured_payload === 'object' ? message.structured_payload as CoachResponsePayload : null
  return {
    id: message.id,
    conversationId: message.conversation_id,
    role: message.role,
    messageType: message.message_type,
    content: message.content ?? (payload ? [payload.headline, payload.summary].filter(Boolean).join('\n\n') : ''),
    payload,
    createdAt: message.created_at,
  }
}

function buildFollowUpFallback(conversationId: string): AIGatewayResponse {
  return {
    requestId: crypto.randomUUID(),
    taskType: 'coach_follow_up',
    status: 'fallback',
    fallbackUsed: true,
    conversationId,
    payload: {
      headline: 'Keep the next step simple.',
      summary: 'Nuraa could not complete the live Coach response, but your deterministic dashboard insights remain available.',
      factualBasis: [{ label: 'Deterministic Nuraa context', sourceReference: 'deterministic:nuraa' }],
      interpretations: [{ statement: 'A small steady action is the safest useful next step.', confidence: 'low' }],
      primaryAction: { title: 'Use today’s visible focus', detail: 'Complete one small action from your dashboard before adding more.' },
      clarificationQuestion: null,
      suggestedPrompts: ['What should I prioritise today?'],
      confidenceNote: 'Live AI was unavailable; deterministic Nuraa context is still active.',
      sourceReferences: ['deterministic:nuraa'],
    },
    safeMeta: {
      responseSchemaVersion: 'phase4b.v1',
      promptContractVersion: 'client-follow-up-fallback',
      schemaValidationPassed: true,
    },
  }
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('COACH_FOLLOW_UP_TIMEOUT')), timeoutMs)
    operation.then(
      (value) => {
        window.clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeout)
        reject(error)
      },
    )
  })
}
