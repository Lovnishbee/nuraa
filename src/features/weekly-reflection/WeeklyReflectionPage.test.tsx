import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getCoachEligibility } from '@/services/coachService'
import { getProfileBundle } from '@/services/profile'
import { generateWeeklyReflection, getCurrentWeeklyReflection } from '@/services/weeklyReflectionService'
import { useAuthStore } from '@/stores/auth-store'
import { WeeklyReflectionPage } from './WeeklyReflectionPage'

vi.mock('@/services/coachService', () => ({
  getCoachEligibility: vi.fn(),
}))

vi.mock('@/services/profile', () => ({
  getProfileBundle: vi.fn(),
}))

vi.mock('@/services/weeklyReflectionService', () => ({
  getCurrentWeeklyReflection: vi.fn(),
  generateWeeklyReflection: vi.fn(),
  markWeeklyReflectionViewed: vi.fn().mockResolvedValue({ status: 'completed', reflection: null }),
  dismissWeeklyReflection: vi.fn(),
  startWeeklyReflectionCoach: vi.fn(),
}))

function renderPage() {
  useAuthStore.setState({ user: { id: 'user-1', email: 'test@nuraa.test' } as never, ready: true })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/weekly-reflection']}>
        <Routes>
          <Route path="/app/weekly-reflection" element={<WeeklyReflectionPage />} />
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

describe('WeeklyReflectionPage', () => {
  it('redirects authenticated non-testers to dashboard', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: false, internalConsentGranted: false, coachEnabled: false, responseDetail: 'balanced' })
    vi.mocked(getProfileBundle).mockResolvedValue({ profile: { full_name: 'Lovnish Bhatia', avatar_url: null } } as never)

    renderPage()

    expect(await screen.findByText('Dashboard redirected')).toBeInTheDocument()
  })

  it('renders a current weekly reflection for eligible beta users', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: true, internalConsentGranted: true, coachEnabled: true, responseDetail: 'balanced' })
    vi.mocked(getProfileBundle).mockResolvedValue({ profile: { full_name: 'Lovnish Bhatia', avatar_url: null } } as never)
    vi.mocked(getCurrentWeeklyReflection).mockResolvedValue({
      requestId: 'request-1',
      status: 'completed',
      reflection: {
        id: '00000000-0000-4000-8000-000000000001',
        user_id: 'user-1',
        week_start_date: '2026-07-07',
        week_end_date: '2026-07-13',
        status: 'generated',
        summary_payload: {
          headline: 'Your week looks broadly steady.',
          weekAtGlance: { summary: 'Your average Nuraa Score was 73.', averageScore: 73, scoreDirection: 'up', confidence: 'moderate' },
          whatChanged: [{ title: 'Readiness moved up', explanation: 'The week improved compared with the previous window.', sourceReference: 'score:1' }],
          whatSupportedYou: [],
          attentionAreas: [],
          nextWeekFocus: { title: 'Create one reset window', detail: 'Add a short pause before your most demanding block.' },
          suggestedCoachPrompts: ['What mattered most this week?'],
          confidenceNote: null,
          sourceReferences: ['score:1'],
        },
        deterministic_metrics: {},
        source_references: [],
        context_envelope_id: null,
        ai_execution_id: null,
        viewed_at: '2026-07-13T00:00:00.000Z',
        dismissed_at: null,
        converted_to_coach_at: null,
        created_at: '2026-07-13T00:00:00.000Z',
        updated_at: '2026-07-13T00:00:00.000Z',
      },
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: /your week looks broadly steady/i })).toBeInTheDocument()
    expect(screen.getByText(/one focus for next week/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ask nuraa/i })).toBeInTheDocument()
  })

  it('shows a safe error when generation fails', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: true, internalConsentGranted: true, coachEnabled: true, responseDetail: 'balanced' })
    vi.mocked(getProfileBundle).mockResolvedValue({ profile: { full_name: 'Lovnish Bhatia', avatar_url: null } } as never)
    vi.mocked(getCurrentWeeklyReflection).mockResolvedValue({ requestId: 'request-1', status: 'completed', reflection: null })
    vi.mocked(generateWeeklyReflection).mockRejectedValue(new Error('WEEKLY_REFLECTION_FAILED'))

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /generate weekly reflection/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be generated/i)
  })
})
