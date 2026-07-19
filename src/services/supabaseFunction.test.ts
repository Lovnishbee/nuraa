import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invokeAuthenticatedFunction } from '@/services/supabaseFunction'
import { getSupabaseClient } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

const getSession = vi.fn()
const invoke = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: { getSession },
    functions: { invoke },
  } as unknown as ReturnType<typeof getSupabaseClient>)
})

describe('invokeAuthenticatedFunction', () => {
  it('passes the active Supabase access token as a bearer header', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
      error: null,
    })
    invoke.mockResolvedValue({ data: { status: 'ok' }, error: null })

    await expect(invokeAuthenticatedFunction('weekly-reflection-engine', { action: 'generate' })).resolves.toEqual({ status: 'ok' })

    expect(invoke).toHaveBeenCalledWith('weekly-reflection-engine', {
      body: { action: 'generate' },
      headers: { Authorization: 'Bearer session-token' },
    })
  })

  it('fails closed before invoking an edge function when no session is available', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })

    await expect(invokeAuthenticatedFunction('ai-gateway', { taskType: 'ask_about_today' })).rejects.toThrow('Authentication required.')

    expect(invoke).not.toHaveBeenCalled()
  })

  it('surfaces edge function invocation errors', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
      error: null,
    })
    invoke.mockResolvedValue({ data: null, error: new Error('Function failed') })

    await expect(invokeAuthenticatedFunction('proactive-cards', { action: 'get_cards' })).rejects.toThrow('Function failed')
  })
})
