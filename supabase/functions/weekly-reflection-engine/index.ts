import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { corsHeaders, extractBearerToken } from '../_shared/ai/edge-http.ts'
import { handleWeeklyReflectionRequest } from '../_shared/weekly-reflection/runtime.ts'

type RuntimeEnv = Record<string, string | undefined>

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405)

  const env = Deno.env.toObject() as RuntimeEnv
  const supabaseUrl = env.SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: { code: 'SERVER_CONFIG_MISSING', message: 'Weekly reflection engine is not configured.' } }, 500)

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

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  })

  try {
    const result = await handleWeeklyReflectionRequest({ client: serviceClient, env, userId, body })
    return json(result.response, result.httpStatus)
  } catch (error) {
    console.error('[weekly-reflection-engine] request failed', {
      userId,
      errorCode: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    })
    return json({ error: { code: 'WEEKLY_REFLECTION_FAILED', message: 'Weekly reflection request could not be completed safely.' } }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
