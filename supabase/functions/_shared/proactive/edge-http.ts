import { corsHeaders, extractBearerToken } from '../ai/edge-http.ts'
import type { ProactiveRuntimeResult } from './runtime.ts'
import type { ProactiveRuntimeEnv, ProactiveSupabaseClient } from './types.ts'

export type ProactiveEdgeCreateClient = (url: string, key: string, options?: unknown) => ProactiveSupabaseClient

export async function handleProactiveEngineHttpRequest(options: {
  request: Request
  env: ProactiveRuntimeEnv
  createClient: ProactiveEdgeCreateClient
  runtimeHandler: (runtimeOptions: { client: ProactiveSupabaseClient; env: ProactiveRuntimeEnv; userId: string; body: unknown }) => Promise<ProactiveRuntimeResult>
}): Promise<Response> {
  if (options.request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (options.request.method !== 'POST') return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405)

  const supabaseUrl = options.env.SUPABASE_URL
  const anonKey = options.env.SUPABASE_ANON_KEY
  const serviceRoleKey = options.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: { code: 'SERVER_CONFIG_MISSING', message: 'Proactive runtime is not configured.' } }, 500)
  }

  const jwt = extractBearerToken(options.request.headers.get('Authorization'))
  if (!jwt) return json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, 401)

  const authClient = options.createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
  const userResult = await authClient.auth?.getUser(jwt)
  const userId = userResult?.data?.user?.id
  if (userResult?.error || !userId) return json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, 401)

  let body: unknown
  try {
    body = await options.request.json()
  } catch {
    return json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, 400)
  }

  const serviceClient = options.createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  })
  const result = await options.runtimeHandler({ client: serviceClient, env: options.env, userId, body })
  return json(result.response, result.httpStatus)
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
