import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { z } from 'zod'
import { corsHeaders, createServiceClientOptions, extractBearerToken, resolveSupabaseKeys } from '../_shared/ai/edge-http.ts'

type RuntimeEnv = Record<string, string | undefined>

const DetailLevelSchema = z.enum(['concise', 'balanced', 'detailed'])

const ControlInputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('get_eligibility') }).strict(),
  z.object({ action: z.literal('archive'), conversationId: z.string().uuid() }).strict(),
  z.object({ action: z.literal('reopen'), conversationId: z.string().uuid() }).strict(),
  z.object({ action: z.literal('delete'), conversationId: z.string().uuid() }).strict(),
  z.object({ action: z.literal('set_consent'), enabled: z.boolean(), responseDetail: DetailLevelSchema.optional() }).strict(),
  z.object({ action: z.literal('set_response_detail'), responseDetail: DetailLevelSchema }).strict(),
  z.object({
    action: z.literal('submit_feedback'),
    conversationId: z.string().uuid(),
    messageId: z.string().uuid(),
    feedbackType: z.enum(['helpful', 'not_helpful', 'too_generic', 'not_relevant', 'too_much_detail', 'not_enough_detail', 'poor_timing']),
  }).strict(),
])

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405)

  const env = Deno.env.toObject() as RuntimeEnv
  const supabaseUrl = env.SUPABASE_URL
  const keys = resolveSupabaseKeys(env)
  if (!supabaseUrl || !keys.publishableKey || !keys.serviceKey) return json({ error: { code: 'SERVER_CONFIG_MISSING', message: 'Coach control is not configured.' } }, 500)

  const jwt = extractBearerToken(request.headers.get('Authorization'))
  if (!jwt) return json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, 401)

  const authClient = createClient(supabaseUrl, keys.publishableKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
  const userResult = await authClient.auth.getUser(jwt)
  const userId = userResult.data.user?.id
  if (userResult.error || !userId) return json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, 400)
  }
  const parsed = ControlInputSchema.safeParse(body)
  if (!parsed.success) return json({ error: { code: 'INVALID_REQUEST', message: 'Coach control request is invalid.' } }, 400)

  const serviceClient = createClient(supabaseUrl, keys.serviceKey, createServiceClientOptions(keys.serviceKey))

  try {
    const result = await handleControlAction(serviceClient, userId, parsed.data, env)
    return json(result, 200)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'COACH_CONTROL_FAILED'
    const status = code === 'NOT_FOUND' || code === 'MESSAGE_NOT_FOUND' ? 404 : code === 'INVALID_TRANSITION' ? 409 : 400
    return json({ error: { code, message: 'Coach control request could not be completed.' } }, status)
  }
})

async function handleControlAction(client: ReturnType<typeof createClient>, userId: string, input: z.infer<typeof ControlInputSchema>, env: RuntimeEnv) {
  if (input.action === 'get_eligibility') {
    const preferences = await getUserAIPreferences(client, userId)
    const aiEnabled = await isFeatureEnabled(client, env, 'AI_ENABLED')
    const askTodayEnabled = await isFeatureEnabled(client, env, 'ENABLE_AI_ASK_ABOUT_TODAY')
    const scoreEnabled = await isFeatureEnabled(client, env, 'ENABLE_AI_SCORE_EXPLANATION')
    const coachEnabled = await isFeatureEnabled(client, env, 'ENABLE_AI_COACH')
    const dashboardEntryEnabled = await isFeatureEnabled(client, env, 'ENABLE_AI_COACH_DASHBOARD_ENTRY')
    const cardToCoachEnabled = await isFeatureEnabled(client, env, 'ENABLE_CARD_TO_COACH')
    const coachAvailable = aiEnabled && askTodayEnabled && coachEnabled
    const dashboardCoachAvailable = coachAvailable && dashboardEntryEnabled
    const cardToCoachAvailable = coachAvailable && cardToCoachEnabled
    const consentGranted = Boolean(preferences?.ai_coaching_enabled)

    return {
      ok: true,
      eligibility: {
        internalEnabled: coachAvailable,
        internalConsentGranted: consentGranted,
        coachAvailable,
        dashboardCoachAvailable,
        cardToCoachAvailable,
        scoreExplanationAvailable: coachAvailable && scoreEnabled && dashboardEntryEnabled,
        coachEnabled: coachAvailable && consentGranted,
        dashboardCoachEnabled: dashboardCoachAvailable && consentGranted,
        cardToCoachEnabled: cardToCoachAvailable && consentGranted,
        scoreExplanationEnabled: coachAvailable && scoreEnabled && dashboardEntryEnabled && consentGranted,
        responseDetail: preferences?.response_detail ?? 'balanced',
        unavailableReason: coachAvailable ? null : firstUnavailableReason({ aiEnabled, askTodayEnabled, coachEnabled }),
      },
    }
  }

  if (input.action === 'set_consent') {
    const now = new Date().toISOString()
    const result = await client.from('user_ai_preferences').upsert({
      user_id: userId,
      ai_coaching_enabled: input.enabled,
      ai_coaching_policy_version: input.enabled ? 'phase4b.v1' : null,
      ai_coaching_consented_at: input.enabled ? now : null,
      ai_coaching_disabled_at: input.enabled ? null : now,
      response_detail: input.responseDetail ?? 'balanced',
    }, { onConflict: 'user_id' }).select('*').single()
    if (result.error) throw new Error(result.error.message)
    return { ok: true, preferences: result.data }
  }

  if (input.action === 'set_response_detail') {
    const existing = await client.from('user_ai_preferences').select('user_id').eq('user_id', userId).maybeSingle()
    const result = existing.data
      ? await client.from('user_ai_preferences').update({ response_detail: input.responseDetail }).eq('user_id', userId).select('*').single()
      : await client.from('user_ai_preferences').insert({ user_id: userId, response_detail: input.responseDetail }).select('*').single()
    if (result.error) throw new Error(result.error.message)
    return { ok: true, preferences: result.data }
  }

  if (input.action === 'submit_feedback') {
    const message = await client.from('coach_messages')
      .select('id, conversation_id, user_id, role')
      .eq('id', input.messageId)
      .eq('conversation_id', input.conversationId)
      .eq('user_id', userId)
      .eq('role', 'nuraa')
      .maybeSingle()
    if (message.error || !message.data) throw new Error('MESSAGE_NOT_FOUND')

    const result = await client.from('coach_feedback').insert({
      user_id: userId,
      conversation_id: input.conversationId,
      message_id: input.messageId,
      feedback_type: input.feedbackType,
    }).select('id').single()
    if (result.error) throw new Error(result.error.message)
    return { ok: true, feedbackId: result.data.id }
  }

  const conversation = await client.from('coach_conversations')
    .select('id, status, archived_at, deleted_at')
    .eq('id', input.conversationId)
    .eq('user_id', userId)
    .maybeSingle<{ id: string; status: string; archived_at: string | null; deleted_at: string | null }>()
  if (conversation.error || !conversation.data || conversation.data.deleted_at || conversation.data.status === 'deleted') throw new Error('NOT_FOUND')

  const now = new Date().toISOString()
  if (input.action === 'archive') {
    if (conversation.data.status === 'archived') return { ok: true }
    if (!['active', 'paused', 'resolved'].includes(conversation.data.status)) throw new Error('INVALID_TRANSITION')
    const result = await client.from('coach_conversations').update({ status: 'archived', archived_at: now, last_active_at: now }).eq('id', input.conversationId).eq('user_id', userId)
    if (result.error) throw new Error(result.error.message)
    return { ok: true }
  }

  if (input.action === 'reopen') {
    if (conversation.data.status !== 'archived') throw new Error('INVALID_TRANSITION')
    await client.from('coach_conversations').update({ status: 'paused', last_active_at: now }).eq('user_id', userId).eq('status', 'active')
    const result = await client.from('coach_conversations').update({ status: 'active', archived_at: null, last_active_at: now }).eq('id', input.conversationId).eq('user_id', userId)
    if (result.error) throw new Error(result.error.message)
    return { ok: true }
  }

  const result = await client.from('coach_conversations').update({ status: 'deleted', deleted_at: now, last_active_at: now }).eq('id', input.conversationId).eq('user_id', userId)
  if (result.error) throw new Error(result.error.message)
  return { ok: true }
}

async function getUserAIPreferences(client: ReturnType<typeof createClient>, userId: string) {
  const result = await client.from('user_ai_preferences')
    .select('ai_coaching_enabled, response_detail')
    .eq('user_id', userId)
    .maybeSingle<{ ai_coaching_enabled: boolean; response_detail: 'concise' | 'balanced' | 'detailed' }>()
  if (result.error || !result.data) return null
  return result.data
}

async function isFeatureEnabled(client: ReturnType<typeof createClient>, env: RuntimeEnv, featureName: string): Promise<boolean> {
  if (!readBooleanEnv(env, featureName, false)) return false
  const result = await client.from('ai_feature_flags')
    .select('enabled')
    .eq('feature_name', featureName)
    .maybeSingle<{ enabled: boolean }>()
  if (result.error || !result.data) return false
  return Boolean(result.data.enabled)
}

function readBooleanEnv(env: RuntimeEnv, key: string, fallback: boolean) {
  const value = env[key]
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function firstUnavailableReason(flags: { aiEnabled: boolean; askTodayEnabled: boolean; coachEnabled: boolean }) {
  if (!flags.aiEnabled) return 'ai_disabled'
  if (!flags.askTodayEnabled) return 'ask_today_disabled'
  if (!flags.coachEnabled) return 'coach_disabled'
  return 'coach_unavailable'
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
