import type { GeneratedCandidate, InsightCandidate, ProactiveSnapshot } from './types.ts'

export function applyFatiguePolicy(rankedCandidates: GeneratedCandidate[], snapshot: ProactiveSnapshot): InsightCandidate[] {
  if (!snapshot.preferences.proactive_guidance_enabled) {
    return rankedCandidates.map((candidate) => suppress(candidate, 'proactive_guidance_disabled'))
  }

  const approved: InsightCandidate[] = []
  const dailyMax = Math.min(snapshot.preferences.max_cards_per_day, 3)

  for (const candidate of rankedCandidates) {
    const baseSuppression = getBaseSuppression(candidate, snapshot, approved)
    if (baseSuppression) {
      approved.push(suppress(candidate, baseSuppression))
      continue
    }

    if (approved.filter((item) => item.status === 'approved').length >= dailyMax) {
      approved.push(suppress(candidate, 'daily_card_cap'))
      continue
    }

    approved.push({ ...candidate, status: 'approved', suppression_reason: null })
  }

  return approved
}

function getBaseSuppression(candidate: GeneratedCandidate, snapshot: ProactiveSnapshot, currentResults: InsightCandidate[]) {
  if (snapshot.preferences.muted_categories.includes(candidate.category)) return 'category_muted'
  if (candidate.confidence_label === 'insufficient') return 'insufficient_confidence'
  if (candidate.confidence_label === 'low' && candidate.candidate_type !== 'data_gap') return 'low_confidence_non_data_gap'
  if (candidate.ranking_score !== null && candidate.ranking_score < 25) return 'ranking_below_threshold'
  if (currentResults.some((item) => item.status === 'approved' && item.category === candidate.category)) return 'same_category_daily_cap'
  if (candidate.candidate_type === 'attention' && currentResults.some((item) => item.status === 'approved' && item.candidate_type === 'attention')) return 'attention_daily_cap'
  if (candidate.candidate_type === 'data_gap' && currentResults.some((item) => item.status === 'approved' && item.candidate_type === 'data_gap')) return 'data_gap_daily_cap'
  if (candidate.candidate_type === 'celebration' && currentResults.some((item) => item.status === 'approved' && item.candidate_type === 'celebration') && rankedNonCelebrationsRemain(candidate, currentResults)) return 'celebration_daily_cap'

  const repeated = snapshot.existingCandidates.find((existing) => existing.theme_key === candidate.theme_key)
  if (!repeated) return null
  const ageHours = hoursBetween(repeated.created_at ?? repeated.eligible_from, snapshot.nowIso)
  const materialChange = hasMaterialChange(candidate, repeated)
  if (materialChange) return null
  if (repeated.suppression_reason?.includes('show_less') && ageHours < 720) return 'show_less_theme_30d'
  if (repeated.suppression_reason?.includes('too_frequent') && ageHours < 504) return 'too_frequent_theme_21d'
  if (repeated.suppression_reason?.includes('not_relevant') && ageHours < 336) return 'not_relevant_category_14d'
  if (['suppressed', 'rejected'].includes(repeated.status) && ageHours < 168) return 'dismissed_theme_7d'
  if (ageHours < 72) return 'same_theme_72h'
  return null
}

function suppress(candidate: GeneratedCandidate, reason: string): InsightCandidate {
  return { ...candidate, status: 'suppressed', suppression_reason: reason }
}

function rankedNonCelebrationsRemain(candidate: GeneratedCandidate, currentResults: InsightCandidate[]) {
  return candidate.candidate_type === 'celebration' && currentResults.some((item) => item.status === 'approved' && item.candidate_type !== 'celebration')
}

function hasMaterialChange(candidate: GeneratedCandidate, previous: InsightCandidate) {
  if (candidate.severity !== previous.severity && severityRank(candidate.severity) > severityRank(previous.severity)) return true
  if (previous.confidence_label === 'low' && ['moderate', 'high'].includes(candidate.confidence_label)) return true
  return Math.abs(candidate.confidence_score - previous.confidence_score) >= 20
}

function severityRank(severity: string) {
  if (severity === 'high') return 3
  if (severity === 'medium') return 2
  return 1
}

function hoursBetween(startIso: string, endIso: string) {
  return Math.max(0, (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000)
}
