import type { RuntimeEnv, RuntimeResult, RuntimeSupabaseClient } from './types.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export type EdgeCreateClient = (url: string, key: string, options?: unknown) => RuntimeSupabaseClient

export type ResolvedSupabaseKeys = {
  publishableKey: string | null
  serviceKey: string | null
}

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
  const keys = resolveSupabaseKeys(options.env)
  if (!supabaseUrl || !keys.publishableKey || !keys.serviceKey) {
    return json({ error: { code: 'SERVER_CONFIG_MISSING', message: 'AI runtime is not configured.' } }, 500)
  }

  const jwt = extractBearerToken(options.request.headers.get('Authorization'))
  if (!jwt) return json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, 401)

  const authClient = options.createClient(supabaseUrl, keys.publishableKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
  const userResult = await authClient.auth?.getUser(jwt)
  const userId = userResult?.data?.user?.id
  if (userResult?.error || !userId) return json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, 401)

  let body: unknown
  try {
    body = await options.request.json()
  } catch {
    return json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, 400)
  }

  const serviceClient = options.createClient(supabaseUrl, keys.serviceKey, createServiceClientOptions(keys.serviceKey))
  const result = await options.runtimeHandler({ client: serviceClient, env: options.env, userId, body })
  return json(result.response, result.httpStatus)
}

export function extractBearerToken(header: string | null): string {
  return header?.replace(/^Bearer\s+/i, '').trim() ?? ''
}

export function resolveSupabaseKeys(env: RuntimeEnv): ResolvedSupabaseKeys {
  // New Supabase projects expose JSON dictionaries of publishable/secret keys.
  // Keep legacy env support so existing deployments do not need to rotate keys.
  return {
    publishableKey: firstNonEmpty(
      env.SUPABASE_PUBLISHABLE_KEY,
      firstKeyFromJson(env.SUPABASE_PUBLISHABLE_KEYS, ['sb_publishable_', 'sbp_']),
      env.SUPABASE_ANON_KEY,
    ),
    serviceKey: firstNonEmpty(
      env.SUPABASE_SECRET_KEY,
      firstKeyFromJson(env.SUPABASE_SECRET_KEYS, ['sb_secret_', 'sbs_']),
      env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  }
}

export function createServiceClientOptions(serviceKey: string): unknown {
  const apiKeyOnly = isApiKeyOnlySecret(serviceKey)
  if (!apiKeyOnly) {
    return {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    }
  }

  return {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { apikey: serviceKey },
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers)
        headers.set('apikey', serviceKey)
        headers.delete('authorization')
        headers.delete('Authorization')
        return fetch(input, { ...init, headers })
      },
    },
  }
}

function isApiKeyOnlySecret(value: string) {
  return value.startsWith('sb_secret_') || value.startsWith('sbs_')
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null
}

function firstKeyFromJson(raw: string | undefined, preferredPrefixes: string[]): string | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    const keys = collectStrings(parsed)
    return keys.find((value) => preferredPrefixes.some((prefix) => value.startsWith(prefix))) ?? keys[0] ?? null
  } catch {
    return raw.trim().length ? raw.trim() : null
  }
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
