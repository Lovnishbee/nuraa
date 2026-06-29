import { describe, expect, it } from 'vitest'
import { classifySafetyRoute, routeSafety, SAFETY_MESSAGES } from './safety-router.ts'

describe('SafetyRouter', () => {
  it.each([
    ['Can you explain my score?', 'S0_routine_wellness'],
    ['Should I change my medication dose?', 'S1_medical_boundary'],
    ['This pain is worsening for weeks', 'S2_timely_professional_review'],
    ['I have chest pain and cannot breathe', 'S3_immediate_safety_or_emergency'],
  ] as const)('routes %s', (question, route) => {
    expect(classifySafetyRoute(question)).toBe(route)
  })

  it('suppresses provider calls for medical boundary routes', () => {
    const decision = routeSafety('ask_about_today', 'Should I stop taking medicine?')

    expect(decision.shouldCallProvider).toBe(false)
    expect(decision.response).toBeTruthy()
    expect(JSON.stringify(decision.response)).toContain(SAFETY_MESSAGES.S1_medical_boundary)
  })
})
