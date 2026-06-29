import { describe, expect, it } from 'vitest'
import { calculateNuraaScore } from '.'
import type { HealthSignal } from '../types'

function signal(scores: Partial<Record<keyof ReturnType<typeof calculateNuraaScore>['factors'], number>>, confidences: Partial<Record<'sleep' | 'stress' | 'recovery' | 'activity' | 'nutrition' | 'hydration', number>> = {}): HealthSignal {
  const mergedScores = { sleep: 70, stress: 70, recovery: 70, activity: 70, nutrition: 70, hydration: 70, ...scores }
  const mergedConfidence = { sleep: 70, stress: 70, recovery: 70, activity: 70, nutrition: 70, hydration: 70, ...confidences }
  return {
    userId: 'user-1',
    date: '2026-06-29',
    sleep: { hours: 7, quality: 4, score: mergedScores.sleep, confidence: mergedConfidence.sleep },
    stress: { level: 2, score: mergedScores.stress, confidence: mergedConfidence.stress },
    recovery: { soreness: 2, energy: 4, motivation: 4, score: mergedScores.recovery, confidence: mergedConfidence.recovery },
    activity: { steps: null, movementScore: mergedScores.activity, confidence: mergedConfidence.activity },
    nutrition: { calories: null, protein: null, score: mergedScores.nutrition, confidence: mergedConfidence.nutrition },
    hydration: { litres: null, score: mergedScores.hydration, confidence: mergedConfidence.hydration },
    context: { goals: [], medicalConditions: [] },
  }
}

describe('score engine', () => {
  it.each([
    [90, 'Peak'],
    [75, 'Ready'],
    [60, 'Steady'],
    [45, 'Low'],
    [30, 'Recovery Needed'],
  ] as const)('classifies %i as %s', (scoreValue, category) => {
    expect(calculateNuraaScore(signal({ sleep: scoreValue, stress: scoreValue, recovery: scoreValue, activity: scoreValue, nutrition: scoreValue, hydration: scoreValue })).category).toBe(category)
  })

  it('calculates the weighted score using Phase 3 factor weights', () => {
    const result = calculateNuraaScore(signal({ sleep: 100, stress: 50, recovery: 50, activity: 0, nutrition: 0, hydration: 100 }))

    expect(result.totalScore).toBe(60)
    expect(result.factors).toEqual({ sleep: 100, stress: 50, recovery: 50, activity: 0, nutrition: 0, hydration: 100 })
  })

  it('calculates weighted confidence independently from the score', () => {
    const result = calculateNuraaScore(signal({}, { sleep: 100, stress: 80, recovery: 60, activity: 40, nutrition: 20, hydration: 0 }))

    expect(result.confidence).toBe(64)
  })
})
