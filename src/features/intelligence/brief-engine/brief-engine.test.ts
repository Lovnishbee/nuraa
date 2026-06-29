import { describe, expect, it } from 'vitest'
import { generateDailyBrief } from '.'
import type { DailyBrief, HealthSignal, InsightRuleResult, NuraaScoreResult } from '../types'

const baseSignal: HealthSignal = {
  userId: 'user-1',
  date: '2026-06-29',
  sleep: { hours: 7, quality: 4, score: 80, confidence: 90 },
  stress: { level: 2, score: 80, confidence: 90 },
  recovery: { soreness: 2, energy: 4, motivation: 4, score: 80, confidence: 90 },
  activity: { steps: null, movementScore: 70, confidence: 20 },
  nutrition: { calories: null, protein: null, score: 70, confidence: 20 },
  hydration: { litres: null, score: 70, confidence: 20 },
  context: { goals: [], medicalConditions: [] },
}

function score(overrides: Partial<NuraaScoreResult> = {}): NuraaScoreResult {
  return {
    userId: 'user-1',
    date: '2026-06-29',
    totalScore: 72,
    category: 'Ready',
    confidence: 72,
    primaryDriver: 'Sleep',
    limitingFactor: 'Hydration',
    explanation: 'Sleep is supporting you today.',
    factors: { sleep: 80, stress: 80, recovery: 80, activity: 70, nutrition: 70, hydration: 70 },
    recommendations: [{ title: 'Hydrate steadily', description: 'Keep water visible.', category: 'hydration', priority: 'low' }],
    ...overrides,
  }
}

function rule(ruleId: string, severity: InsightRuleResult['severity'] = 'caution'): InsightRuleResult {
  return {
    ruleId,
    title: ruleId,
    description: `${ruleId} description`,
    category: ruleId,
    severity,
    recommendation: `${ruleId} recommendation`,
  }
}

function expectBrief(brief: DailyBrief, headline: string) {
  expect(brief.headline).toBe(headline)
  expect(brief.focus.length).toBeGreaterThan(0)
}

describe('brief engine', () => {
  it('uses the confidence-limited path', () => {
    expectBrief(generateDailyBrief(baseSignal, score({ confidence: 30 }), []), 'Your baseline is taking shape.')
  })

  it('uses the sleep recovery path', () => {
    expectBrief(generateDailyBrief(baseSignal, score(), [rule('poor_sleep')]), 'Your body may need a gentler day.')
  })

  it('uses the stress path', () => {
    expectBrief(generateDailyBrief(baseSignal, score(), [rule('high_stress')]), 'A calmer pace may serve you today.')
  })

  it('uses the positive path', () => {
    expectBrief(generateDailyBrief(baseSignal, score(), [rule('good_readiness', 'positive')]), 'You’re ready for a strong day.')
  })

  it('uses the fallback path', () => {
    expectBrief(generateDailyBrief(baseSignal, score({ totalScore: 54, category: 'Low' }), [rule('baseline_building', 'neutral')]), 'Your body is asking for steady basics.')
  })
})
