import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '@/lib/supabase'
import { invokeAuthenticatedFunction } from '@/services/supabaseFunction'
import { getCoachEligibility, setCoachConsent, updateCoachResponseDetail } from './coachService'

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('@/services/supabaseFunction', () => ({
  invokeAuthenticatedFunction: vi.fn(),
}))

const getUser = vi.fn()
const maybeSingle = vi.fn()
const single = vi.fn()
const upsert = vi.fn()
const from = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle,
  upsert,
  single,
}))

beforeEach(() => {
  vi.clearAllMocks()
  upsert.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    single,
  })
  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: { getUser },
    from,
  } as unknown as ReturnType<typeof getSupabaseClient>)
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  maybeSingle.mockResolvedValue({ data: null, error: null })
  single.mockResolvedValue({ data: preferenceRow({ ai_coaching_enabled: true }), error: null })
})

describe('getCoachEligibility', () => {
  it('uses coach-control for server-authoritative eligibility', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockResolvedValue({
      ok: true,
      eligibility: {
        internalEnabled: true,
        internalConsentGranted: true,
        coachAvailable: true,
        dashboardCoachAvailable: true,
        cardToCoachAvailable: true,
        scoreExplanationAvailable: true,
        coachEnabled: true,
        dashboardCoachEnabled: true,
        cardToCoachEnabled: true,
        scoreExplanationEnabled: true,
        responseDetail: 'balanced',
        unavailableReason: null,
      },
    })

    await expect(getCoachEligibility()).resolves.toMatchObject({
      coachAvailable: true,
      coachEnabled: true,
      dashboardCoachEnabled: true,
    })
    expect(invokeAuthenticatedFunction).toHaveBeenCalledWith('coach-control', { action: 'get_eligibility' })
  })

  it('falls back to user preferences when coach-control eligibility is unavailable', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockRejectedValue(new Error('Function not found'))
    maybeSingle.mockResolvedValue({
      data: preferenceRow({ ai_coaching_enabled: true, response_detail: 'detailed' }),
      error: null,
    })

    await expect(getCoachEligibility()).resolves.toMatchObject({
      coachAvailable: true,
      coachEnabled: true,
      internalConsentGranted: true,
      responseDetail: 'detailed',
      unavailableReason: null,
    })
  })

  it('shows consent when legacy eligibility has no consent yet', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockRejectedValue(new Error('Function not found'))

    await expect(getCoachEligibility()).resolves.toMatchObject({
      coachAvailable: true,
      coachEnabled: false,
      internalConsentGranted: false,
      responseDetail: 'balanced',
      unavailableReason: null,
    })
  })

  it('falls back to an RLS-protected preference upsert when setting consent fails through coach-control', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockRejectedValue(new Error('Function not found'))
    const saved = preferenceRow({ ai_coaching_enabled: true, response_detail: 'concise' })
    single.mockResolvedValue({ data: saved, error: null })

    await expect(setCoachConsent('user-1', true, 'concise')).resolves.toEqual(saved)
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      ai_coaching_enabled: true,
      ai_coaching_policy_version: 'phase4b.v1',
      response_detail: 'concise',
    }), { onConflict: 'user_id' })
  })

  it('preserves consent metadata when response detail falls back to user-policy upsert', async () => {
    vi.mocked(invokeAuthenticatedFunction).mockRejectedValue(new Error('Function not found'))
    maybeSingle.mockResolvedValue({
      data: preferenceRow({
        ai_coaching_enabled: true,
        ai_coaching_policy_version: 'phase4b.v1',
        ai_coaching_consented_at: '2026-07-25T00:00:00.000Z',
      }),
      error: null,
    })

    await updateCoachResponseDetail('user-1', 'detailed')
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      ai_coaching_enabled: true,
      ai_coaching_policy_version: 'phase4b.v1',
      ai_coaching_consented_at: '2026-07-25T00:00:00.000Z',
      response_detail: 'detailed',
    }), { onConflict: 'user_id' })
  })
})

function preferenceRow(overrides: Partial<{
  ai_coaching_enabled: boolean
  ai_coaching_policy_version: string | null
  ai_coaching_consented_at: string | null
  ai_coaching_disabled_at: string | null
  response_detail: 'concise' | 'balanced' | 'detailed'
}> = {}) {
  return {
    id: 'pref-1',
    user_id: 'user-1',
    ai_coaching_enabled: false,
    ai_coaching_policy_version: null,
    ai_coaching_consented_at: null,
    ai_coaching_disabled_at: null,
    response_detail: 'balanced' as const,
    created_at: '2026-07-25T00:00:00.000Z',
    updated_at: '2026-07-25T00:00:00.000Z',
    ...overrides,
  }
}
