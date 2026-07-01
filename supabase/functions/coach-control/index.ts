import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { z } from 'zod'
import { corsHeaders, extractBearerToken } from '../_shared/ai/edge-http.ts'

type RuntimeEnv = Record<string, string | undefined>

const DetailLevelSchema = z.enum(['concise', 'balanced', 'detailed'])

const ControlInputSchema = z.discriminatedUnion('action', [
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
  const anonKey = env.SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: { code: 'SERVER_CONFIG_MISSING', message: 'Coach control is not configured.' } }, 500)

  const jwt = extractBearerToken(request.headers.get('Authorization'))
  if (!jwt) return json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, 401)

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
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

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  })

  try {
    const result = await handleControlAction(serviceClient, userId, parsed.data)
    return json(result, 200)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'COACH_CONTROL_FAILED'
    const status = code === 'NOT_FOUND' || code === 'MESSAGE_NOT_FOUND' ? 404 : code === 'INVALID_TRANSITION' ? 409 : 400
    return json({ error: { code, message: 'Coach control request could not be completed.' } }, status)
  }
})

async function handleControlAction(client: ReturnType<typeof createClient>, userId: string, input: z.infer<typeof ControlInputSchema>) {
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

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
