import { round } from '../scoring-utils'
import type { HealthSignal, NuraaScoreCategory, NuraaScoreResult, RecommendationCategory } from '../types'

const WEIGHTS = {
  sleep: 30,
  stress: 20,
  recovery: 20,
  activity: 10,
  nutrition: 10,
  hydration: 10,
} as const

function getCategory(score: number): NuraaScoreCategory {
  if (score >= 85) return 'Peak'
  if (score >= 70) return 'Ready'
  if (score >= 55) return 'Steady'
  if (score >= 40) return 'Low'
  return 'Recovery Needed'
}

function titleForFactor(factor: keyof typeof WEIGHTS) {
  return {
    sleep: 'Sleep',
    stress: 'Stress balance',
    recovery: 'Recovery',
    activity: 'Movement',
    nutrition: 'Nutrition',
    hydration: 'Hydration',
  }[factor]
}

function recommendationForFactor(factor: keyof typeof WEIGHTS, score: number) {
  const priority = score < 55 ? 'high' : score < 70 ? 'medium' : 'low'
  const copy: Record<keyof typeof WEIGHTS, { title: string; description: string; category: RecommendationCategory }> = {
    sleep: { title: 'Protect sleep tonight', description: 'Aim for an earlier wind-down and keep the evening routine simple.', category: 'sleep' },
    stress: { title: 'Create a calm pocket', description: 'A short breathing break or lighter walk may help reduce load today.', category: 'stress' },
    recovery: { title: 'Choose recovery-first movement', description: 'Keep intensity modest and give your body room to reset.', category: 'recovery' },
    activity: { title: 'Add gentle movement', description: 'A short walk is enough to keep your rhythm active.', category: 'activity' },
    nutrition: { title: 'Anchor your next meal', description: 'Start with a simple whole-food protein and steady carbohydrates.', category: 'nutrition' },
    hydration: { title: 'Hydrate steadily', description: 'Keep water visible and sip consistently through the day.', category: 'hydration' },
  }
  return { ...copy[factor], priority } as const
}

export function calculateNuraaScore(signal: HealthSignal): NuraaScoreResult {
  const factors = {
    sleep: signal.sleep.score,
    stress: signal.stress.score,
    recovery: signal.recovery.score,
    activity: signal.activity.movementScore,
    nutrition: signal.nutrition.score,
    hydration: signal.hydration.score,
  }
  const totalScore = round(Object.entries(WEIGHTS).reduce((sum, [factor, weight]) => sum + factors[factor as keyof typeof factors] * (weight / 100), 0))
  const confidence = round(
    signal.sleep.confidence * 0.3
    + signal.stress.confidence * 0.2
    + signal.recovery.confidence * 0.2
    + signal.activity.confidence * 0.1
    + signal.nutrition.confidence * 0.1
    + signal.hydration.confidence * 0.1,
  )
  const entries = Object.entries(factors) as [keyof typeof factors, number][]
  const primary = entries.reduce((best, current) => current[1] > best[1] ? current : best)
  const limiting = entries.reduce((lowest, current) => current[1] < lowest[1] ? current : lowest)
  const category = getCategory(totalScore)
  const recommendations = entries
    .filter(([, value]) => value < 76)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([factor, value]) => recommendationForFactor(factor, value))

  const explanation = category === 'Peak' || category === 'Ready'
    ? `Your check-in suggests ${titleForFactor(primary[0]).toLowerCase()} is supporting you today. Keep your basics steady and protect the rhythm that is working.`
    : `Your check-in suggests ${titleForFactor(limiting[0]).toLowerCase()} may need attention today. Consider a gentler plan while your baseline continues to build.`

  return {
    userId: signal.userId,
    date: signal.date,
    totalScore,
    category,
    confidence,
    primaryDriver: titleForFactor(primary[0]),
    limitingFactor: titleForFactor(limiting[0]),
    explanation,
    factors,
    recommendations,
  }
}
