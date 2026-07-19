import { invokeAuthenticatedFunction } from '@/services/supabaseFunction'
import type { ProactiveCard, ProactiveCardFeedbackType, ProactiveEngineInput, ProactiveEngineResponse } from '@/features/proactive/types'

export type ProactiveCardsSummary = {
  status: 'completed' | 'disabled'
  reason?: string
  cards: ProactiveCard[]
}

export async function getProactiveCards(): Promise<ProactiveCardsSummary> {
  const generated = await invokeProactiveCards({ action: 'generate_cards' })
  if (generated.status === 'disabled') return { status: 'disabled', reason: generated.reason, cards: [] }
  const cards = generated.cards?.length ? generated.cards : (await invokeProactiveCards({ action: 'get_cards' })).cards ?? []
  return { status: 'completed', cards }
}

export async function markProactiveCardShown(cardId: string) {
  return invokeProactiveCards({ action: 'mark_shown', cardId })
}

export async function dismissProactiveCard(cardId: string) {
  return invokeProactiveCards({ action: 'dismiss_card', cardId })
}

export async function snoozeProactiveCard(cardId: string) {
  return invokeProactiveCards({ action: 'snooze_card', cardId })
}

export async function submitProactiveCardFeedback(cardId: string, feedbackType: ProactiveCardFeedbackType, feedbackReason?: string) {
  return invokeProactiveCards({ action: 'submit_feedback', cardId, feedbackType, feedbackReason })
}

export async function startProactiveCardCoachHandoff(cardId: string) {
  return invokeProactiveCards({ action: 'start_coach_handoff', cardId })
}

async function invokeProactiveCards(input: ProactiveEngineInput): Promise<ProactiveEngineResponse> {
  return invokeAuthenticatedFunction<ProactiveEngineResponse>('proactive-cards', input)
}
