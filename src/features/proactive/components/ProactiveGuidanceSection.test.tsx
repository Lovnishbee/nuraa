import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProactiveGuidanceSection } from './ProactiveGuidanceSection'
import { startProactiveCardCoachHandoff } from '@/services/proactiveCards'
import type { ProactiveCard } from '../types'

const navigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/services/proactiveCards', () => ({
  dismissProactiveCard: vi.fn(),
  markProactiveCardShown: vi.fn(),
  snoozeProactiveCard: vi.fn(),
  startProactiveCardCoachHandoff: vi.fn(),
  submitProactiveCardFeedback: vi.fn(),
}))

describe('ProactiveGuidanceSection', () => {
  it('does not navigate to Coach when the server disables card handoff', async () => {
    vi.mocked(startProactiveCardCoachHandoff).mockResolvedValue({
      requestId: 'request-1',
      status: 'disabled',
      reason: 'card_flags_disabled',
      candidates: [],
    })

    renderSection()

    fireEvent.click(await screen.findByRole('button', { name: /ask coach/i }))

    await waitFor(() => expect(startProactiveCardCoachHandoff).toHaveBeenCalledWith(card.id))
    expect(navigate).not.toHaveBeenCalled()
  })
})

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProactiveGuidanceSection
        cards={[card]}
        isLoading={false}
        isError={false}
        enabled
        coachEnabled
        onRetry={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

const card: ProactiveCard = {
  id: '00000000-0000-4000-8000-000000000701',
  user_id: '00000000-0000-4000-8000-000000000001',
  candidate_id: '00000000-0000-4000-8000-000000000702',
  health_date: '2026-06-29',
  card_type: 'opportunity',
  category: 'hydration',
  severity: 'low',
  title: 'Hydrate earlier today',
  body: 'Your recent pattern suggests water intake is the simplest focus.',
  primary_action_label: 'Keep water visible',
  primary_action_type: 'habit',
  primary_action_payload: { detail: 'Place a bottle near your desk.' },
  evidence_refs: [{ label: 'Hydration signal', explanation: 'Hydration was a relevant factor.', sourceReference: 'score_factors:00000000-0000-4000-8000-000000000401' }],
  confidence_score: 72,
  confidence_label: 'moderate',
  status: 'shown',
  source_engine_version: 'phase-v-b.v1',
  copy_source: 'deterministic',
  shown_at: '2026-06-29T14:00:00.000Z',
  dismissed_at: null,
  snoozed_until: null,
  created_at: '2026-06-29T14:00:00.000Z',
  updated_at: '2026-06-29T14:00:00.000Z',
}
