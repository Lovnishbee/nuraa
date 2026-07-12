import { describe, expect, it } from 'vitest'
import { generateProactiveCards } from './card-engine.ts'
import type { InsightCandidate, ProactiveSnapshot } from './types.ts'

const userId = '00000000-0000-4000-8000-000000000001'
const nowIso = '2026-07-11T10:00:00.000Z'

describe('Phase V-B proactive card engine', () => {
  it('converts top approved candidates into deterministic cards with safe evidence', () => {
    const result = generateProactiveCards(snapshot({
      existingCandidates: [
        candidate('sleep_window', { ranking_score: 91, category: 'sleep' }),
        candidate('hydration_nudge', { ranking_score: 80, category: 'hydration' }),
      ],
    }))

    expect(result.generated).toBe(2)
    expect(result.cards.map((card) => card.title)).toEqual(['Sleep Window', 'Hydration Nudge'])
    expect(result.cards[0].copy_source).toBe('deterministic')
    expect(result.cards[0].evidence_refs[0]).toMatchObject({ sourceReference: 'health_signal:sleep_window' })
  })

  it('enforces daily, category, attention, data-gap, and celebration caps', () => {
    const result = generateProactiveCards(snapshot({
      existingCandidates: [
        candidate('stress_attention', { ranking_score: 99, candidate_type: 'attention', category: 'stress' }),
        candidate('sleep_attention', { ranking_score: 98, candidate_type: 'attention', category: 'sleep' }),
        candidate('energy_gap', { ranking_score: 97, candidate_type: 'data_gap', category: 'energy' }),
        candidate('hydration_gap', { ranking_score: 96, candidate_type: 'data_gap', category: 'hydration' }),
        candidate('ready_win', { ranking_score: 95, candidate_type: 'celebration', category: 'readiness' }),
        candidate('activity_win', { ranking_score: 94, candidate_type: 'celebration', category: 'activity' }),
      ],
    }))

    expect(result.cards).toHaveLength(3)
    expect(result.cards.map((card) => card.candidate_id)).toEqual(['stress_attention', 'energy_gap', 'ready_win'])
    expect(result.suppressed.map((item) => item.reason)).toEqual(expect.arrayContaining(['attention_daily_cap', 'data_gap_daily_cap', 'daily_card_cap']))
  })

  it('suppresses low-confidence, muted, expired, and already-active candidates', () => {
    const result = generateProactiveCards(snapshot({
      preferences: { muted_categories: ['hydration'] },
      existingCards: [{ ...card('active_sleep'), candidate_id: 'active_sleep', category: 'sleep' }],
      existingCandidates: [
        candidate('active_sleep', { category: 'sleep' }),
        candidate('low_confidence', { confidence_score: 40, category: 'stress' }),
        candidate('muted_hydration', { category: 'hydration' }),
        candidate('expired_energy', { category: 'energy', expires_at: '2026-07-10T00:00:00.000Z' }),
      ],
    }))

    expect(result.cards).toHaveLength(0)
    expect(result.suppressed).toEqual([{ candidateId: 'active_sleep', themeKey: 'active_sleep', reason: 'card_already_active' }])
  })

  it('uses recent feedback to suppress repeated categories', () => {
    const result = generateProactiveCards(snapshot({
      existingCards: [{ ...card('old_card'), category: 'stress' }],
      recentFeedback: [{ user_id: userId, card_id: 'old_card', feedback_type: 'show_less_like_this', feedback_reason: null, created_at: '2026-07-10T10:00:00.000Z' }],
      existingCandidates: [candidate('stress_reset', { category: 'stress' })],
    }))

    expect(result.cards).toHaveLength(0)
    expect(result.suppressed[0]).toMatchObject({ reason: 'show_less_theme_suppression' })
  })
})

function candidate(themeKey: string, overrides: Partial<InsightCandidate> = {}): InsightCandidate {
  return {
    id: themeKey,
    user_id: userId,
    health_date: '2026-07-11',
    theme_key: themeKey,
    candidate_hash: `${themeKey}:hash`,
    data_window_start: '2026-06-28',
    data_window_end: '2026-07-11',
    candidate_type: 'opportunity',
    category: 'sleep',
    severity: 'medium',
    confidence_score: 80,
    confidence_label: 'high',
    deterministic_title: titleCase(themeKey),
    deterministic_summary: `A practical ${themeKey} pattern is available today.`,
    recommended_action: { title: 'Try one small action', detail: 'Keep this simple and time-bound.' },
    evidence_json: {
      summary: 'Safe aggregate evidence.',
      confidence: 'high',
      limitations: [],
      evidence: [{ label: 'Signal', explanation: 'Based on deterministic signals.', sourceReference: `health_signal:${themeKey}` }],
    },
    source_references: [`health_signal:${themeKey}`],
    ranking_score: 75,
    status: 'approved',
    eligible_from: '2026-07-11T00:00:00.000Z',
    expires_at: '2026-07-12T00:00:00.000Z',
    suppression_reason: null,
    created_by_engine_version: 'phase-v-a.v1',
    created_at: '2026-07-11T00:00:00.000Z',
    updated_at: '2026-07-11T00:00:00.000Z',
    ...overrides,
  }
}

function card(id: string) {
  return {
    id,
    user_id: userId,
    candidate_id: id,
    health_date: '2026-07-11',
    card_type: 'opportunity' as const,
    category: 'sleep' as const,
    severity: 'medium' as const,
    title: 'Existing card',
    body: 'Already active.',
    primary_action_label: null,
    primary_action_type: null,
    primary_action_payload: {},
    evidence_refs: [],
    confidence_score: 80,
    confidence_label: 'high' as const,
    status: 'active' as const,
    source_engine_version: 'phase-v-b.v1',
    copy_source: 'deterministic' as const,
    shown_at: null,
    dismissed_at: null,
    snoozed_until: null,
    created_at: '2026-07-11T00:00:00.000Z',
    updated_at: '2026-07-11T00:00:00.000Z',
  }
}

function snapshot(overrides: Partial<ProactiveSnapshot> = {}): ProactiveSnapshot {
  return {
    userId,
    timezone: 'Asia/Kolkata',
    healthDate: '2026-07-11',
    windowStart: '2026-07-05',
    windowEnd: '2026-07-11',
    nowIso,
    scores: [],
    scoreFactors: [],
    healthSignals: [],
    dailyCheckins: [],
    dailyBriefs: [],
    insightEvents: [],
    goals: [],
    userPreferences: null,
    coachFeedback: [],
    existingCandidates: [],
    existingCards: [],
    recentFeedback: [],
    ...overrides,
    preferences: { user_id: userId, proactive_guidance_enabled: true, max_cards_per_day: 3, muted_categories: [], reduced_categories: [], ...overrides.preferences },
  }
}

function titleCase(value: string) {
  return value.split('_').map((item) => item[0].toUpperCase() + item.slice(1)).join(' ')
}
