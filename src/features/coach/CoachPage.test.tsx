import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getCoachEligibility, getCoachMessages, listCoachConversations, sendCoachFollowUp, startCoachHome, startScoreExplanation, type CoachEligibility } from '@/services/coachService'
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
    sendCoachFollowUp: vi.fn(),
    startCoachHome: vi.fn(),
    startScoreExplanation: vi.fn(),
  }
})

vi.mock('@/services/intelligence', () => ({
  getDashboardSummary: vi.fn(),
}))

function renderCoachPage(initialEntry = '/app/coach') {
  useAuthStore.setState({ user: { id: 'user-1', email: 'test@nuraa.test' } as never, ready: true })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/coach" element={<CoachPage />} />
          <Route path="/app/dashboard" element={<div>Dashboard redirected</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function coachEligibility(overrides: Partial<CoachEligibility> = {}): CoachEligibility {
  return {
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
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, ready: false })
})

describe('CoachPage access and consent', () => {
  it('shows unavailable when Coach server access is disabled', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue(coachEligibility({
      internalEnabled: false,
      internalConsentGranted: false,
      coachAvailable: false,
      dashboardCoachAvailable: false,
      cardToCoachAvailable: false,
      scoreExplanationAvailable: false,
      coachEnabled: false,
      dashboardCoachEnabled: false,
      cardToCoachEnabled: false,
      scoreExplanationEnabled: false,
      unavailableReason: 'coach_disabled',
    }))
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([])

    renderCoachPage()

    expect(await screen.findByRole('heading', { name: /coach is unavailable/i })).toBeInTheDocument()
  })

  it('shows first-use consent before Coach is enabled', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue(coachEligibility({ internalConsentGranted: false, coachEnabled: false, dashboardCoachEnabled: false, scoreExplanationEnabled: false }))
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([])

    renderCoachPage()

    expect(await screen.findByRole('heading', { name: /enable nuraa coach/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enable coach/i })).toBeInTheDocument()
  })

  it('opens the latest active conversation instead of leaving the composer disabled', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue(coachEligibility())
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
    expect(startScoreExplanation).not.toHaveBeenCalled()
  })

  it('does not render the optimistic score explanation again after the persisted message loads', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue(coachEligibility())
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([])
    vi.mocked(startScoreExplanation).mockResolvedValue({
      requestId: 'request-1',
      taskType: 'explain_score',
      status: 'completed',
      fallbackUsed: false,
      conversationId: 'conversation-1',
      messageId: 'message-1',
      payload: {
        headline: '72 · Ready',
        summary: 'Your check-in suggests recovery is supporting you today.',
        factualBasis: [{ label: 'Latest Nuraa Score is 72', sourceReference: 'score:today' }],
        interpretations: [{ statement: 'Recovery is steady.', confidence: 'moderate' }],
        primaryAction: { title: 'Take a breathing break', detail: 'Use two quiet minutes before your next demanding block.' },
        confidenceNote: 'Nuraa confidence is 80 based on current deterministic signals.',
        followUpQuestions: ['Why is this my focus today?'],
        sourceReferences: ['score:today'],
      },
      safeMeta: { responseSchemaVersion: 'phase4a.v1', schemaValidationPassed: true },
    } as never)
    vi.mocked(getCoachMessages).mockResolvedValue([
      {
        id: 'message-1',
        role: 'nuraa',
        messageType: 'score_explanation',
        content: '72 · Ready\n\nYour check-in suggests recovery is supporting you today.',
        payload: {
          headline: '72 · Ready',
          summary: 'Your check-in suggests recovery is supporting you today.',
          factualBasis: [{ label: 'Latest Nuraa Score is 72', sourceReference: 'score:today' }],
          interpretations: [{ statement: 'Recovery is steady.', confidence: 'moderate' }],
          primaryAction: { title: 'Take a breathing break', detail: 'Use two quiet minutes before your next demanding block.' },
          confidenceNote: 'Nuraa confidence is 80 based on current deterministic signals.',
          followUpQuestions: ['Why is this my focus today?'],
          sourceReferences: ['score:today'],
        },
        createdAt: '2026-07-24T00:00:00.000Z',
      },
    ])

    renderCoachPage('/app/coach?action=explain_score')

    expect(await screen.findByText('72 · Ready')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('72 · Ready')).toHaveLength(1))
  })

  it('keeps the submitted follow-up visible with the Nuraa reply', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue(coachEligibility())
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([
      {
        id: 'conversation-1',
        user_id: 'user-1',
        entry_point: 'coach_home',
        status: 'active',
        deterministic_title: 'Today’s guidance',
        last_active_at: '2026-07-24T00:00:00.000Z',
        archived_at: null,
        deleted_at: null,
        created_at: '2026-07-24T00:00:00.000Z',
        updated_at: '2026-07-24T00:00:00.000Z',
      } as never,
    ])
    vi.mocked(getCoachMessages).mockResolvedValue([
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: 'nuraa',
        messageType: 'coach_opening',
        content: 'Keep today simple.',
        payload: {
          headline: 'Keep today simple.',
          summary: 'Use one practical reset window.',
          suggestedPrompts: ['What should I prioritise today?'],
          sourceReferences: [],
        },
        createdAt: '2026-07-24T00:00:00.000Z',
      },
    ])
    vi.mocked(sendCoachFollowUp).mockResolvedValue({
      requestId: 'request-follow-up',
      taskType: 'coach_follow_up',
      status: 'completed',
      fallbackUsed: false,
      conversationId: 'conversation-1',
      messageId: 'message-2',
      payload: {
        headline: 'Prioritise one steady action',
        summary: 'Keep the next step practical and low-friction.',
        factualBasis: [{ label: 'Current Nuraa context', sourceReference: 'deterministic:nuraa' }],
        interpretations: [{ statement: 'A small action is useful today.', confidence: 'moderate' }],
        primaryAction: { title: 'Take a breathing break', detail: 'Use two quiet minutes before your next demanding block.' },
        clarificationQuestion: null,
        suggestedPrompts: ['What is one simple action I can take?'],
        confidenceNote: 'Based on deterministic Nuraa context.',
        sourceReferences: ['deterministic:nuraa'],
      },
      safeMeta: { responseSchemaVersion: 'phase4b.v1', schemaValidationPassed: true },
    } as never)

    renderCoachPage()

    expect(await screen.findByText('Keep today simple.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText(/ask nuraa coach/i)).not.toBeDisabled())
    const promptButton = screen.getAllByRole('button', { name: /what should i prioritise today/i }).find((button) => !button.hasAttribute('disabled'))
    expect(promptButton).toBeDefined()
    fireEvent.click(promptButton!)

    await waitFor(() => expect(sendCoachFollowUp).toHaveBeenCalledWith(
      'conversation-1',
      'What should I prioritise today?',
      'balanced',
      expect.stringMatching(/^follow_/),
    ))
    await waitFor(() => expect(screen.getAllByText('What should I prioritise today?').length).toBeGreaterThanOrEqual(2))
    expect(await screen.findByText('Prioritise one steady action')).toBeInTheDocument()
  })

  it('sends typed follow-ups against the active conversation', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue(coachEligibility())
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([
      {
        id: 'conversation-1',
        user_id: 'user-1',
        entry_point: 'coach_home',
        status: 'active',
        deterministic_title: 'Today’s guidance',
        last_active_at: '2026-07-24T00:00:00.000Z',
        archived_at: null,
        deleted_at: null,
        created_at: '2026-07-24T00:00:00.000Z',
        updated_at: '2026-07-24T00:00:00.000Z',
      } as never,
    ])
    vi.mocked(getCoachMessages).mockResolvedValue([
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: 'nuraa',
        messageType: 'coach_opening',
        content: 'Keep today simple.',
        payload: {
          headline: 'Keep today simple.',
          summary: 'Use one practical reset window.',
          suggestedPrompts: [],
          sourceReferences: [],
        },
        createdAt: '2026-07-24T00:00:00.000Z',
      },
    ])
    vi.mocked(sendCoachFollowUp).mockResolvedValue({
      requestId: 'request-follow-up',
      taskType: 'coach_follow_up',
      status: 'completed',
      fallbackUsed: false,
      conversationId: 'conversation-1',
      messageId: 'message-2',
      payload: {
        headline: 'Protect your next block',
        summary: 'Use one clear reset before adding more tasks.',
        factualBasis: [{ label: 'Current Nuraa context', sourceReference: 'deterministic:nuraa' }],
        interpretations: [{ statement: 'A small reset is useful today.', confidence: 'moderate' }],
        primaryAction: { title: 'Pause for two minutes', detail: 'Take two quiet minutes before the next demanding block.' },
        clarificationQuestion: null,
        suggestedPrompts: [],
        confidenceNote: 'Based on deterministic Nuraa context.',
        sourceReferences: ['deterministic:nuraa'],
      },
      safeMeta: { responseSchemaVersion: 'phase4b.v1', schemaValidationPassed: true },
    } as never)

    renderCoachPage()

    expect(await screen.findByText('Keep today simple.')).toBeInTheDocument()
    const composer = screen.getByLabelText(/ask nuraa coach/i)
    await waitFor(() => expect(composer).not.toBeDisabled())
    fireEvent.change(composer, { target: { value: 'How should I plan my evening?' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => expect(sendCoachFollowUp).toHaveBeenCalledWith(
      'conversation-1',
      'How should I plan my evening?',
      'balanced',
      expect.stringMatching(/^follow_/),
    ))
    expect(await screen.findByText('Protect your next block')).toBeInTheDocument()
  })

  it('keeps the composer enabled for a paused visible conversation', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue(coachEligibility())
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([
      {
        id: 'conversation-1',
        user_id: 'user-1',
        entry_point: 'coach_home',
        status: 'paused',
        deterministic_title: 'Today’s guidance',
        last_active_at: '2026-07-24T00:00:00.000Z',
        archived_at: null,
        deleted_at: null,
        created_at: '2026-07-24T00:00:00.000Z',
        updated_at: '2026-07-24T00:00:00.000Z',
      } as never,
    ])
    vi.mocked(getCoachMessages).mockResolvedValue([
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: 'nuraa',
        messageType: 'coach_opening',
        content: 'Keep today simple.',
        payload: {
          headline: 'Keep today simple.',
          summary: 'Use one practical reset window.',
          suggestedPrompts: [],
          sourceReferences: [],
        },
        createdAt: '2026-07-24T00:00:00.000Z',
      },
    ])

    renderCoachPage()

    expect(await screen.findByText('Keep today simple.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText(/ask nuraa coach/i)).not.toBeDisabled())
  })

  it('starts a fresh Coach conversation only once', async () => {
    vi.mocked(getCoachEligibility).mockResolvedValue(coachEligibility())
    vi.mocked(getDashboardSummary).mockResolvedValue({ score: null, signal: null, brief: null, factors: null, scoreHistory: [], insights: [] })
    vi.mocked(listCoachConversations).mockResolvedValue([
      {
        id: 'conversation-1',
        user_id: 'user-1',
        entry_point: 'coach_home',
        status: 'active',
        deterministic_title: 'Today’s guidance',
        last_active_at: '2026-07-24T00:00:00.000Z',
        archived_at: null,
        deleted_at: null,
        created_at: '2026-07-24T00:00:00.000Z',
        updated_at: '2026-07-24T00:00:00.000Z',
      } as never,
    ])
    vi.mocked(getCoachMessages).mockResolvedValue([
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        role: 'nuraa',
        messageType: 'coach_opening',
        content: 'Keep today simple.',
        payload: {
          headline: 'Keep today simple.',
          summary: 'Use one practical reset window.',
          suggestedPrompts: [],
          sourceReferences: [],
        },
        createdAt: '2026-07-24T00:00:00.000Z',
      },
    ])
    vi.mocked(startCoachHome).mockResolvedValue({
      requestId: 'request-fresh',
      taskType: 'ask_about_today',
      status: 'completed',
      fallbackUsed: false,
      conversationId: 'conversation-2',
      messageId: 'message-2',
      payload: {
        headline: 'Fresh Coach start',
        summary: 'Use the latest Nuraa context.',
        primaryFocus: { title: 'Take one step', detail: 'Start with one clear action.' },
        factualBasis: [{ label: 'Current Nuraa context', sourceReference: 'deterministic:nuraa' }],
        suggestedPrompts: ['What is one simple action I can take?'],
        confidenceNote: 'Based on deterministic Nuraa context.',
        sourceReferences: ['deterministic:nuraa'],
      },
      safeMeta: { responseSchemaVersion: 'phase4b.v1', schemaValidationPassed: true },
    } as never)

    renderCoachPage()

    expect(await screen.findByText('Keep today simple.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /start fresh/i }))

    expect(await screen.findByText('Fresh Coach start')).toBeInTheDocument()
    await waitFor(() => expect(startCoachHome).toHaveBeenCalledTimes(1))
  })
})
