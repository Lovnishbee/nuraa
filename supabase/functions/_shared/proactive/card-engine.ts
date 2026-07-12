import { PROACTIVE_CARD_ENGINE_VERSION, type InsightCandidate, type ProactiveCard, type ProactiveCardFeedback, type ProactiveCardGenerationResult, type ProactiveSnapshot, type SourceReference } from './types.ts'

const MIN_CONFIDENCE_SCORE = 55
const MAX_ATTENTION_PER_DAY = 1
const MAX_DATA_GAP_PER_DAY = 1
const MAX_CELEBRATION_PER_DAY = 1
const SNOOZE_HOURS = 24

export function generateProactiveCards(snapshot: ProactiveSnapshot): ProactiveCardGenerationResult {
  if (!snapshot.preferences.proactive_guidance_enabled) {
    return { status: 'completed', healthDate: snapshot.healthDate, generated: 0, cards: [], suppressed: [] }
  }

  const now = new Date(snapshot.nowIso)
  const existingCards = snapshot.existingCards ?? []
  const recentFeedback = snapshot.recentFeedback ?? []
  const eligible = snapshot.existingCandidates
    .filter((candidate) => isCandidateEligible(candidate, snapshot, now))
    .sort((left, right) => (right.ranking_score ?? 0) - (left.ranking_score ?? 0))

  const cards: ProactiveCard[] = []
  const suppressed: ProactiveCardGenerationResult['suppressed'] = []
  const usedCategories = new Set<string>()
  let attentionCount = 0
  let dataGapCount = 0
  let celebrationCount = 0
  const dailyLimit = Math.max(0, Math.min(snapshot.preferences.max_cards_per_day ?? 3, 3))

  const nonCelebrationExists = eligible.some((candidate) => candidate.candidate_type !== 'celebration')

  for (const candidate of eligible) {
    if (cards.length >= dailyLimit) {
      suppressed.push(toSuppression(candidate, 'daily_card_cap'))
      continue
    }
    const existing = existingCards.find((card) => card.candidate_id === candidate.id)
    if (existing && !isInactive(existing, now)) {
      suppressed.push(toSuppression(candidate, 'card_already_active'))
      continue
    }
    const feedbackReason = feedbackSuppressionReason(candidate, existingCards, recentFeedback, now)
    if (feedbackReason) {
      suppressed.push(toSuppression(candidate, feedbackReason))
      continue
    }
    if (usedCategories.has(candidate.category)) {
      suppressed.push(toSuppression(candidate, 'category_daily_cap'))
      continue
    }
    if (candidate.candidate_type === 'attention' && attentionCount >= MAX_ATTENTION_PER_DAY) {
      suppressed.push(toSuppression(candidate, 'attention_daily_cap'))
      continue
    }
    if (candidate.candidate_type === 'data_gap' && dataGapCount >= MAX_DATA_GAP_PER_DAY) {
      suppressed.push(toSuppression(candidate, 'data_gap_daily_cap'))
      continue
    }
    if (candidate.candidate_type === 'celebration' && nonCelebrationExists && celebrationCount >= MAX_CELEBRATION_PER_DAY) {
      suppressed.push(toSuppression(candidate, 'celebration_daily_cap'))
      continue
    }

    const card = cardFromCandidate(candidate)
    cards.push(card)
    usedCategories.add(candidate.category)
    if (candidate.candidate_type === 'attention') attentionCount += 1
    if (candidate.candidate_type === 'data_gap') dataGapCount += 1
    if (candidate.candidate_type === 'celebration') celebrationCount += 1
  }

  return { status: 'completed', healthDate: snapshot.healthDate, generated: cards.length, cards, suppressed }
}

function isCandidateEligible(candidate: InsightCandidate, snapshot: ProactiveSnapshot, now: Date): boolean {
  if (!candidate.id) return false
  if (candidate.status !== 'approved' && candidate.status !== 'converted_to_card') return false
  if (candidate.health_date !== snapshot.healthDate) return false
  if (candidate.confidence_score < MIN_CONFIDENCE_SCORE || candidate.confidence_label === 'insufficient') return false
  if (new Date(candidate.eligible_from).getTime() > now.getTime()) return false
  if (new Date(candidate.expires_at).getTime() <= now.getTime()) return false
  if (snapshot.preferences.muted_categories.includes(candidate.category)) return false
  if (!Array.isArray(candidate.evidence_json?.evidence) || candidate.evidence_json.evidence.length === 0) return false
  return true
}

function cardFromCandidate(candidate: InsightCandidate): ProactiveCard {
  const action = candidate.recommended_action
  return {
    user_id: candidate.user_id,
    candidate_id: candidate.id!,
    health_date: candidate.health_date,
    card_type: candidate.candidate_type,
    category: candidate.category,
    severity: candidate.severity,
    title: sanitizeCardText(candidate.deterministic_title, 120),
    body: sanitizeCardText(candidate.deterministic_summary, 320),
    primary_action_label: action?.title ? sanitizeCardText(action.title, 80) : null,
    primary_action_type: action?.title ? 'wellness_action' : null,
    primary_action_payload: action?.detail ? { detail: sanitizeCardText(action.detail, 180) } : {},
    evidence_refs: candidate.evidence_json.evidence.slice(0, 4).map(safeEvidenceRef),
    confidence_score: candidate.confidence_score,
    confidence_label: candidate.confidence_label,
    status: 'active',
    source_engine_version: PROACTIVE_CARD_ENGINE_VERSION,
    copy_source: 'deterministic',
    shown_at: null,
    dismissed_at: null,
    snoozed_until: null,
  }
}

function safeEvidenceRef(reference: SourceReference): SourceReference {
  return {
    label: sanitizeCardText(reference.label, 80),
    explanation: sanitizeCardText(reference.explanation, 180),
    sourceReference: sanitizeCardText(reference.sourceReference, 120),
  }
}

function sanitizeCardText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}…` : normalized
}

function feedbackSuppressionReason(candidate: InsightCandidate, cards: ProactiveCard[], feedback: ProactiveCardFeedback[], now: Date): string | null {
  for (const item of feedback) {
    const card = cards.find((existing) => existing.id === item.card_id)
    if (!card || card.category !== candidate.category) continue
    const ageMs = now.getTime() - new Date(item.created_at ?? now.toISOString()).getTime()
    if (item.feedback_type === 'show_less_like_this' && ageMs < days(30)) return 'show_less_theme_suppression'
    if (item.feedback_type === 'too_frequent' && ageMs < days(21)) return 'too_frequent_category_suppression'
    if (item.feedback_type === 'not_relevant' && ageMs < days(14)) return 'not_relevant_category_suppression'
  }
  return null
}

function isInactive(card: ProactiveCard, now: Date): boolean {
  if (card.status === 'dismissed' || card.status === 'archived' || card.status === 'expired') return true
  if (card.status === 'snoozed' && card.snoozed_until && new Date(card.snoozed_until).getTime() <= now.getTime()) return true
  return false
}

function toSuppression(candidate: InsightCandidate, reason: string) {
  return { candidateId: candidate.id ?? candidate.theme_key, themeKey: candidate.theme_key, reason }
}

export function snoozeUntil(now = new Date()): string {
  return new Date(now.getTime() + SNOOZE_HOURS * 60 * 60 * 1000).toISOString()
}

function days(value: number) {
  return value * 86_400_000
}
