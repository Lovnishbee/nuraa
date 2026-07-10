import { clamp } from './confidence.ts'
import type { CandidateCategory, GeneratedCandidate, ProactiveSnapshot, RankingBreakdown } from './types.ts'

const categoryPriority: Record<CandidateCategory, number> = {
  data_gap: 15,
  recovery: 14,
  sleep: 13,
  stress: 13,
  readiness: 12,
  energy: 11,
  activity: 10,
  hydration: 9,
  nutrition: 9,
  mood: 8,
  consistency: 8,
  goal_progress: 8,
  weekly_pattern: 0,
  coach_followup: 0,
}

export function rankCandidate(candidate: GeneratedCandidate, snapshot: ProactiveSnapshot): RankingBreakdown {
  const confidenceWeight = Math.round((candidate.confidence_score / 100) * 25)
  const recencyWeight = 20
  const goalRelevance = getGoalRelevance(candidate, snapshot)
  const noveltyBonus = hasRecentSameTheme(candidate, snapshot) ? 0 : 10
  const actionabilityScore = candidate.recommended_action ? 15 : candidate.candidate_type === 'observation' ? 8 : 4
  const fatiguePenalty = snapshot.preferences.reduced_categories.includes(candidate.category) ? -10 : 0
  const dismissalPenalty = getDismissalPenalty(candidate, snapshot)
  const repetitionPenalty = hasRecentSameTheme(candidate, snapshot) ? -25 : 0
  const lowConfidencePenalty = candidate.confidence_label === 'low' ? -20 : candidate.confidence_label === 'insufficient' ? -40 : 0
  const score = clamp(
    confidenceWeight + recencyWeight + goalRelevance + categoryPriority[candidate.category] + noveltyBonus + actionabilityScore + fatiguePenalty + dismissalPenalty + repetitionPenalty + lowConfidencePenalty,
    -100,
    100,
  )

  return {
    score,
    confidenceWeight,
    recencyWeight,
    goalRelevance,
    categoryPriority: categoryPriority[candidate.category],
    noveltyBonus,
    actionabilityScore,
    fatiguePenalty,
    dismissalPenalty,
    repetitionPenalty,
    lowConfidencePenalty,
  }
}

export function rankCandidates(candidates: GeneratedCandidate[], snapshot: ProactiveSnapshot): GeneratedCandidate[] {
  return candidates
    .map((candidate) => {
      const ranking = rankCandidate(candidate, snapshot)
      return { ...candidate, ranking_score: ranking.score, rankingBreakdown: ranking }
    })
    .sort(compareRankedCandidates)
}

function compareRankedCandidates(left: GeneratedCandidate, right: GeneratedCandidate) {
  const diff = (right.ranking_score ?? 0) - (left.ranking_score ?? 0)
  if (Math.abs(diff) > 3) return diff
  return tiePriority(right) - tiePriority(left)
}

function tiePriority(candidate: GeneratedCandidate) {
  const order = { data_gap: 6, attention: 5, opportunity: 4, observation: 3, celebration: 2 } as const
  return order[candidate.candidate_type]
}

function getGoalRelevance(candidate: GeneratedCandidate, snapshot: ProactiveSnapshot) {
  const labels = snapshot.goals
    .filter((goal) => goal.status === 'active')
    .map((goal) => `${goal.goal_type ?? ''} ${goal.goal_label ?? ''}`.toLowerCase())
    .join(' ')
  if (!labels) return 0
  if (candidate.category === 'sleep' && labels.includes('sleep')) return 15
  if (candidate.category === 'energy' && labels.includes('energy')) return 15
  if (candidate.category === 'activity' && (labels.includes('strength') || labels.includes('muscle') || labels.includes('weight'))) return 12
  if (candidate.category === 'nutrition' && (labels.includes('weight') || labels.includes('diabetes') || labels.includes('thyroid') || labels.includes('pcos'))) return 12
  if (candidate.category === 'goal_progress') return 15
  return 4
}

function hasRecentSameTheme(candidate: GeneratedCandidate, snapshot: ProactiveSnapshot) {
  return snapshot.existingCandidates.some((existing) => existing.theme_key === candidate.theme_key && daysBetween(existing.created_at ?? existing.eligible_from, snapshot.nowIso) < 3)
}

function getDismissalPenalty(candidate: GeneratedCandidate, snapshot: ProactiveSnapshot) {
  const recent = snapshot.existingCandidates.find((existing) => existing.theme_key === candidate.theme_key && ['suppressed', 'rejected'].includes(existing.status))
  if (!recent) return 0
  if (recent.suppression_reason?.includes('show_less')) return -25
  if (recent.suppression_reason?.includes('too_frequent')) return -18
  if (recent.suppression_reason?.includes('not_relevant')) return -14
  return -10
}

function daysBetween(startIso: string, endIso: string) {
  return Math.max(0, (new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000)
}
