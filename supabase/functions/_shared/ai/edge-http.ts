import type { RuntimeEnv, RuntimeResult, RuntimeSupabaseClient } from './types.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export type EdgeCreateClient = (url: string, key: string, options?: unknown) => RuntimeSupabaseClient

export async function handleAIGatewayHttpRequest(options: {
  request: Request
  env: RuntimeEnv
  createClient: EdgeCreateClient
  runtimeHandler: (runtimeOptions: { client: RuntimeSupabaseClient; env: RuntimeEnv; userId: string; body: unknown }) => Promise<RuntimeResult>
}): Promise<Response> {
  if (options.request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (options.request.method !== 'POST') {
    return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, 405)
  }

  const supabaseUrl = options.env.SUPABASE_URL
  const anonKey = options.env.SUPABASE_ANON_KEY
  const serviceRoleKey = options.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: { code: 'SERVER_CONFIG_MISSING', message: 'AI runtime is not configured.' } }, 500)
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

export function extractBearerToken(header: string | null): string {
  return header?.replace(/^Bearer\s+/i, '').trim() ?? ''
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
