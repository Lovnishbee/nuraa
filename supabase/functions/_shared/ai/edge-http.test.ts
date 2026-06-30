import { describe, expect, it, vi } from 'vitest'
import { handleAIGatewayHttpRequest } from './edge-http.ts'
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
