import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getCoachEligibility, listCoachConversations } from '@/services/coachService'
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
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, ready: false })
})

describe('CoachPage access and consent', () => {
  it('redirects authenticated non-testers to dashboard', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: false, internalConsentGranted: false, coachEnabled: false, responseDetail: 'balanced' })

    renderCoachPage()

    expect(await screen.findByText('Dashboard redirected')).toBeInTheDocument()
  })

  it('shows first-use consent for allowlisted users before Coach is enabled', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: true, internalConsentGranted: true, coachEnabled: false, responseDetail: 'balanced' })
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([])

    renderCoachPage()

    expect(await screen.findByRole('heading', { name: /enable nuraa coach/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enable coach/i })).toBeInTheDocument()
  })
})
