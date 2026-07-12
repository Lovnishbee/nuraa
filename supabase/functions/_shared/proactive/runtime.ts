import { generateProactiveCandidates } from './candidate-engine.ts'
import { generateProactiveCards, snoozeUntil } from './card-engine.ts'
import { buildProactiveSnapshot, evaluateProactiveAccess, getActiveProactiveCards, getOwnedCard, getProactiveSummary, insertProactiveCardFeedback, persistInsightCandidates, persistProactiveCards, updateProactiveCardStatus, writeCardEvent } from './repository.ts'
import type { InsightCandidate, ProactiveCard, ProactiveCardFeedbackType, ProactiveGenerationResult, ProactiveRuntimeEnv, ProactiveSupabaseClient } from './types.ts'

export type ProactiveEngineInput = {
  action: 'generate_candidates' | 'get_summary' | 'generate_cards' | 'get_cards' | 'mark_shown' | 'dismiss_card' | 'snooze_card' | 'submit_feedback' | 'start_coach_handoff'
  cardId?: string
  feedbackType?: ProactiveCardFeedbackType
  feedbackReason?: string
}

export type ProactiveEngineResponse = {
  requestId: string
  status: 'completed' | 'disabled'
  reason?: string
  healthDate?: string
  generated?: number
  approved?: number
  suppressed?: number
  candidates: InsightCandidate[]
  cards?: ProactiveCard[]
  card?: ProactiveCard
  conversationId?: string
}

export type ProactiveRuntimeResult = {
  httpStatus: number
  response: ProactiveEngineResponse | { error: { code: string; message: string } }
}

export async function handleProactiveEngineRequest(options: {
  client: ProactiveSupabaseClient
  env: ProactiveRuntimeEnv
  userId: string
  body: unknown
  now?: Date
}): Promise<ProactiveRuntimeResult> {
  const requestId = crypto.randomUUID()
  const parsed = parseInput(options.body)
  if (!parsed.ok) {
    return { httpStatus: 400, response: { error: { code: 'INVALID_REQUEST', message: 'Unsupported proactive engine request.' } } }
  }

  const surface = getAccessSurface(parsed.input.action)
  const access = await evaluateProactiveAccess(options.client, options.userId, surface)
  if (!access.enabled) {
    return {
      httpStatus: 200,
      response: { requestId, status: 'disabled', reason: access.reason ?? undefined, candidates: [] },
    }
  }

  if (parsed.input.action === 'get_summary') {
    const candidates = await getProactiveSummary(options.client, options.userId)
    return {
      httpStatus: 200,
      response: { requestId, status: 'completed', candidates },
    }
  }

  if (parsed.input.action === 'get_cards') {
    const cards = await getActiveProactiveCards(options.client, options.userId, options.now)
    return { httpStatus: 200, response: { requestId, status: 'completed', candidates: [], cards } }
  }

  if (parsed.input.action === 'generate_cards') {
    const snapshot = await buildProactiveSnapshot(options.client, options.userId, options.now)
    let candidates = snapshot.existingCandidates
    if (!candidates.some((candidate) => candidate.health_date === snapshot.healthDate && candidate.status === 'approved')) {
      const candidateResult = generateProactiveCandidates(snapshot)
      candidates = await persistInsightCandidates(options.client, candidateResult.candidates)
    }
    const cardSnapshot = { ...snapshot, existingCandidates: candidates }
    const cardResult = generateProactiveCards(cardSnapshot)
    const cards = await persistProactiveCards(options.client, cardResult.cards)
    return {
      httpStatus: 200,
      response: { requestId, status: 'completed', healthDate: cardResult.healthDate, generated: cards.length, candidates, cards, suppressed: cardResult.suppressed.length },
    }
  }

  if (parsed.input.action === 'mark_shown') {
    const card = await updateProactiveCardStatus(options.client, options.userId, parsed.input.cardId!, { status: 'shown', shown_at: new Date().toISOString() })
    await writeCardEvent(options.client, options.userId, card.id!, 'shown')
    return { httpStatus: 200, response: { requestId, status: 'completed', candidates: [], cards: [card], card } }
  }

  if (parsed.input.action === 'dismiss_card') {
    const card = await updateProactiveCardStatus(options.client, options.userId, parsed.input.cardId!, { status: 'dismissed', dismissed_at: new Date().toISOString() })
    await writeCardEvent(options.client, options.userId, card.id!, 'dismissed')
    return { httpStatus: 200, response: { requestId, status: 'completed', candidates: [], cards: [], card } }
  }

  if (parsed.input.action === 'snooze_card') {
    const now = options.now ?? new Date()
    const card = await updateProactiveCardStatus(options.client, options.userId, parsed.input.cardId!, { status: 'snoozed', snoozed_until: snoozeUntil(now) })
    await writeCardEvent(options.client, options.userId, card.id!, 'snoozed', { snoozedUntil: card.snoozed_until })
    return { httpStatus: 200, response: { requestId, status: 'completed', candidates: [], cards: [], card } }
  }

  if (parsed.input.action === 'submit_feedback') {
    const result = await insertProactiveCardFeedback(options.client, {
      userId: options.userId,
      cardId: parsed.input.cardId!,
      feedbackType: parsed.input.feedbackType!,
      feedbackReason: parsed.input.feedbackReason,
    })
    return { httpStatus: 200, response: { requestId, status: 'completed', candidates: [], cards: [result.card], card: result.card } }
  }

  if (parsed.input.action === 'start_coach_handoff') {
    const card = await getOwnedCard(options.client, options.userId, parsed.input.cardId!)
    await writeCardEvent(options.client, options.userId, card.id!, 'coach_handoff_started', { candidateId: card.candidate_id })
    return { httpStatus: 200, response: { requestId, status: 'completed', candidates: [], cards: [card], card } }
  }

  const snapshot = await buildProactiveSnapshot(options.client, options.userId, options.now)
  const result = generateProactiveCandidates(snapshot)
  const persisted = await persistInsightCandidates(options.client, result.candidates)
  return {
    httpStatus: 200,
    response: toResponse(requestId, result, persisted),
  }
}

function parseInput(body: unknown): { ok: true; input: ProactiveEngineInput } | { ok: false } {
  if (!body || typeof body !== 'object') return { ok: false }
  const action = (body as { action?: unknown }).action
  const allowedActions = ['generate_candidates', 'get_summary', 'generate_cards', 'get_cards', 'mark_shown', 'dismiss_card', 'snooze_card', 'submit_feedback', 'start_coach_handoff'] as const
  if (!allowedActions.includes(action as typeof allowedActions[number])) return { ok: false }
  const keys = Object.keys(body)
  if (keys.some((key) => !['action', 'cardId', 'feedbackType', 'feedbackReason'].includes(key))) return { ok: false }
  const cardId = (body as { cardId?: unknown }).cardId
  const feedbackType = (body as { feedbackType?: unknown }).feedbackType
  const feedbackReason = (body as { feedbackReason?: unknown }).feedbackReason
  if (['mark_shown', 'dismiss_card', 'snooze_card', 'submit_feedback', 'start_coach_handoff'].includes(action as string) && !isUuid(cardId)) return { ok: false }
  if (action === 'submit_feedback' && !['helpful', 'not_helpful', 'not_relevant', 'too_frequent', 'show_less_like_this'].includes(String(feedbackType))) return { ok: false }
  if (feedbackReason !== undefined && (typeof feedbackReason !== 'string' || feedbackReason.length > 240)) return { ok: false }
  return { ok: true, input: { action: action as ProactiveEngineInput['action'], cardId: typeof cardId === 'string' ? cardId : undefined, feedbackType: feedbackType as ProactiveCardFeedbackType | undefined, feedbackReason } }
}

function toResponse(requestId: string, result: ProactiveGenerationResult, candidates: InsightCandidate[]): ProactiveEngineResponse {
  return {
    requestId,
    status: result.status,
    healthDate: result.healthDate,
    generated: result.generated,
    approved: candidates.filter((candidate) => candidate.status === 'approved').length,
    suppressed: candidates.filter((candidate) => candidate.status === 'suppressed').length,
    candidates,
  }
}

function isCardAction(action: ProactiveEngineInput['action']) {
  return ['generate_cards', 'get_cards', 'mark_shown', 'dismiss_card', 'snooze_card', 'submit_feedback', 'start_coach_handoff'].includes(action)
}

function getAccessSurface(action: ProactiveEngineInput['action']) {
  if (action === 'submit_feedback') return 'card_feedback'
  if (action === 'start_coach_handoff') return 'card_coach'
  return isCardAction(action) ? 'cards' : 'dev'
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
