import type { ConfidenceBreakdown, ConfidenceLabel } from './types.ts'

export function labelConfidence(score: number): ConfidenceLabel {
  if (score >= 80) return 'high'
  if (score >= 55) return 'moderate'
  if (score >= 35) return 'low'
  return 'insufficient'
}

export function calculateConfidence(input: {
  validDataPoints: number
  expectedDataPoints: number
  consistency: number
  latestAgeDays: number
  sourceQuality: number
  contradictions?: number
  limitations?: string[]
}): ConfidenceBreakdown {
  const coverageRatio = ratio(input.validDataPoints, Math.max(input.expectedDataPoints, 1))
  const dataCoverageScore = Math.round(clamp(coverageRatio, 0, 1) * 30)
  const signalConsistencyScore = Math.round(clamp(input.consistency, 0, 1) * 25)
  const recencyScore = Math.round(clamp(1 - input.latestAgeDays / 7, 0, 1) * 20)
  const sourceQualityScore = Math.round(clamp(input.sourceQuality, 0, 1) * 15)
  const contradictionPenalty = Math.round(clamp(input.contradictions ?? 0, 0, 1) * 10)
  const score = clamp(dataCoverageScore + signalConsistencyScore + recencyScore + sourceQualityScore - contradictionPenalty, 0, 100)
  const limitations = [...input.limitations ?? []]
  if (coverageRatio < 0.55) limitations.push('Limited recent data')
  if (input.latestAgeDays > 2) limitations.push('Latest signal is not from today')
  if ((input.contradictions ?? 0) > 0) limitations.push('Some signals point in different directions')

  return {
    score,
    label: labelConfidence(score),
    dataCoverageScore,
    signalConsistencyScore,
    recencyScore,
    sourceQualityScore,
    contradictionPenalty,
    limitations: Array.from(new Set(limitations)),
  }
}

function ratio(value: number, total: number) {
  if (total <= 0) return 0
  return value / total
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
