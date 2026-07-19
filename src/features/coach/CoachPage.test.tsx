import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getCoachEligibility, getCoachMessages, listCoachConversations, startCoachHome } from '@/services/coachService'
import { getDashboardSummary } from '@/services/intelligence'
import { useAuthStore } from '@/stores/auth-store'
import { CoachPage } from './CoachPage'

vi.mock('@/services/coachService', async () => {
  const actual = await vi.importActual<typeof import('@/services/coachService')>('@/services/coachService')
  return {
    ...actual,
    getCoachEligibility: vi.fn(),
    listCoachConversations: vi.fn(),
    getCoachMessages: vi.fn(),
    startCoachHome: vi.fn(),
  }
})

vi.mock('@/services/intelligence', () => ({
  getDashboardSummary: vi.fn(),
}))

function renderCoachPage() {
  useAuthStore.setState({ user: { id: 'user-1', email: 'test@nuraa.test' } as never, ready: true })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/coach']}>
        <Routes>
          <Route path="/app/coach" element={<CoachPage />} />
          <Route path="/app/dashboard" element={<div>Dashboard redirected</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, ready: false })
})

describe('CoachPage access and consent', () => {
  it('shows consent for authenticated users who have not enabled Coach yet', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: false, internalConsentGranted: false, coachEnabled: false, responseDetail: 'balanced' })
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([])

    renderCoachPage()

    expect(await screen.findByRole('heading', { name: /enable nuraa coach/i })).toBeInTheDocument()
  })

  it('shows first-use consent before Coach is enabled', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: true, internalConsentGranted: true, coachEnabled: false, responseDetail: 'balanced' })
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([])

    renderCoachPage()

    expect(await screen.findByRole('heading', { name: /enable nuraa coach/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enable coach/i })).toBeInTheDocument()
  })

  it('opens the latest active conversation instead of leaving the composer disabled', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: true, internalConsentGranted: true, coachEnabled: true, responseDetail: 'balanced' })
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([
      {
        id: 'conversation-1',
        user_id: 'user-1',
        entry_point: 'coach_home',
        status: 'active',
        deterministic_title: 'Today’s guidance',
        last_active_at: '2026-07-17T00:00:00.000Z',
        archived_at: null,
        deleted_at: null,
        created_at: '2026-07-17T00:00:00.000Z',
        updated_at: '2026-07-17T00:00:00.000Z',
      } as never,
    ])
    vi.mocked(getCoachMessages).mockResolvedValue([
      {
        id: 'message-1',
        role: 'nuraa',
        messageType: 'coach_opening',
        content: 'Keep today simple.',
        payload: {
          headline: 'Keep today simple.',
          summary: 'Use one practical reset window.',
          suggestedPrompts: ['What should I prioritise today?'],
          sourceReferences: [],
        },
        createdAt: '2026-07-17T00:00:00.000Z',
      },
    ])

    renderCoachPage()

    expect(await screen.findByText('Keep today simple.')).toBeInTheDocument()
    expect(screen.getByLabelText(/ask nuraa coach/i)).not.toBeDisabled()
    expect(startCoachHome).not.toHaveBeenCalled()
  })
})
