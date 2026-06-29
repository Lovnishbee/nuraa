import { describe, expect, it } from 'vitest'
import { runInsightRules } from '.'
import type { HealthSignal } from '../types'

function signal(overrides: Partial<HealthSignal> = {}): HealthSignal {
  const base: HealthSignal = {
    userId: 'user-1',
    date: '2026-06-29',
    sleep: { hours: 6.5, quality: 3, score: 70, confidence: 90 },
    stress: { level: 3, score: 70, confidence: 90 },
    recovery: { soreness: 3, energy: 3, motivation: 3, score: 70, confidence: 90 },
    activity: { steps: null, movementScore: 70, confidence: 20 },
    nutrition: { calories: null, protein: null, score: 70, confidence: 20 },
    hydration: { litres: null, score: 70, confidence: 20 },
    context: { goals: [], medicalConditions: [] },
  }
  return { ...base, ...overrides }
}

describe('rules engine', () => {
  it('triggers poor sleep', () => {
    expect(runInsightRules(signal({ sleep: { hours: 5.5, quality: 3, score: 52, confidence: 90 } })).map((rule) => rule.ruleId)).toContain('poor_sleep')
  })

  it('triggers high stress', () => {
    expect(runInsightRules(signal({ stress: { level: 4, score: 35, confidence: 90 } })).map((rule) => rule.ruleId)).toContain('high_stress')
  })

  it('triggers low energy', () => {
    expect(runInsightRules(signal({ recovery: { soreness: 3, energy: 2, motivation: 3, score: 50, confidence: 90 } })).map((rule) => rule.ruleId)).toContain('low_energy')
  })

  it('triggers high soreness', () => {
    expect(runInsightRules(signal({ recovery: { soreness: 4, energy: 3, motivation: 3, score: 50, confidence: 90 } })).map((rule) => rule.ruleId)).toContain('high_soreness')
  })

  it('triggers low motivation', () => {
    expect(runInsightRules(signal({ recovery: { soreness: 3, energy: 3, motivation: 2, score: 60, confidence: 90 } })).map((rule) => rule.ruleId)).toContain('low_motivation')
  })

  it('returns baseline when no specific rule applies', () => {
    expect(runInsightRules(signal()).map((rule) => rule.ruleId)).toEqual(['baseline_building'])
  })

  it('triggers good readiness', () => {
    expect(runInsightRules(signal({ sleep: { hours: 7.5, quality: 4, score: 90, confidence: 90 }, stress: { level: 2, score: 82, confidence: 90 }, recovery: { soreness: 2, energy: 4, motivation: 4, score: 85, confidence: 90 } })).map((rule) => rule.ruleId)).toContain('good_readiness')
  })
})
