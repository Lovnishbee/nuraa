import { describe, expect, it, vi } from 'vitest'
import { createServiceClientOptions, handleAIGatewayHttpRequest, resolveSupabaseKeys } from './edge-http.ts'
import type { AIGatewayResponse, RuntimeSupabaseClient } from './types.ts'

const env = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
}

describe('ai-gateway HTTP auth boundary', () => {
  it('rejects missing bearer token before runtime execution', async () => {
    const runtimeHandler = vi.fn()
    const response = await handleAIGatewayHttpRequest({
      request: new Request('https://nuraa.test/functions/v1/ai-gateway', { method: 'POST', body: '{}' }),
      env,
      createClient: fakeCreateClient({ userId: 'user-1' }),
      runtimeHandler,
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } })
    expect(runtimeHandler).not.toHaveBeenCalled()
  })

  it('rejects invalid authenticated state before runtime execution', async () => {
    const runtimeHandler = vi.fn()
    const response = await handleAIGatewayHttpRequest({
      request: new Request('https://nuraa.test/functions/v1/ai-gateway', { method: 'POST', headers: { Authorization: 'Bearer bad-token' }, body: '{}' }),
      env,
      createClient: fakeCreateClient({ authError: true }),
      runtimeHandler,
    })

    expect(response.status).toBe(401)
    expect(runtimeHandler).not.toHaveBeenCalled()
  })

  it('passes only the verified user id and service client into the runtime', async () => {
    const runtimeResponse: AIGatewayResponse = {
      requestId: '00000000-0000-4000-8000-000000000901',
      taskType: 'ask_about_today',
      status: 'disabled',
      fallbackUsed: true,
      payload: { headline: 'This feature is not available.', summary: 'Nuraa’s core health insights are still available.' },
      safeMeta: { responseSchemaVersion: 'phase4a.v1' },
    }
    const runtimeHandler = vi.fn().mockResolvedValue({ httpStatus: 200, response: runtimeResponse })

    const response = await handleAIGatewayHttpRequest({
      request: new Request('https://nuraa.test/functions/v1/ai-gateway', {
        method: 'POST',
        headers: { Authorization: 'Bearer good-token' },
        body: JSON.stringify({ taskType: 'ask_about_today', entryPoint: 'internal_dev', userId: 'attacker-id' }),
      }),
      env,
      createClient: fakeCreateClient({ userId: 'verified-user' }),
      runtimeHandler,
    })

    expect(response.status).toBe(200)
    expect(runtimeHandler).toHaveBeenCalledWith(expect.objectContaining({ userId: 'verified-user' }))
    expect(runtimeHandler.mock.calls[0][0].body).toEqual({ taskType: 'ask_about_today', entryPoint: 'internal_dev', userId: 'attacker-id' })
  })

  it('resolves current Supabase publishable and secret key dictionaries', () => {
    const keys = resolveSupabaseKeys({
      SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ current: 'sb_publishable_current', previous: ['sb_publishable_old'] }),
      SUPABASE_SECRET_KEYS: JSON.stringify({ current: 'sb_secret_current', previous: ['sb_secret_old'] }),
    })

    expect(keys).toEqual({ publishableKey: 'sb_publishable_current', serviceKey: 'sb_secret_current' })
  })

  it('keeps legacy Supabase keys as fallback for older deployments', () => {
    const keys = resolveSupabaseKeys({
      SUPABASE_ANON_KEY: 'legacy-anon',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role',
    })

    expect(keys).toEqual({ publishableKey: 'legacy-anon', serviceKey: 'legacy-service-role' })
  })

  it('strips authorization for API-key-only Supabase secret keys', async () => {
    const options = createServiceClientOptions('sb_secret_current') as {
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      }
    }
    const originalFetch = globalThis.fetch
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchSpy)

    try {
      await options.global.fetch('https://project.supabase.co/rest/v1/profiles', {
        headers: { Authorization: 'Bearer sb_secret_current', apikey: 'sb_secret_current' },
      })
    } finally {
      vi.stubGlobal('fetch', originalFetch)
    }

    const headers = fetchSpy.mock.calls[0][1].headers as Headers
    expect(headers.get('apikey')).toBe('sb_secret_current')
    expect(headers.get('authorization')).toBeNull()
  })
})

function fakeCreateClient(options: { userId?: string; authError?: boolean }) {
  return vi.fn((_url: string, key: string): RuntimeSupabaseClient => ({
    auth: {
      getUser: vi.fn().mockResolvedValue(options.authError
        ? { data: { user: null }, error: { message: 'invalid token' } }
        : { data: { user: { id: options.userId ?? 'user-1' } }, error: null }),
    },
    from: vi.fn(),
    __key: key,
  } as unknown as RuntimeSupabaseClient))
}
