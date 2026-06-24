import { describe, expect, it } from 'vitest'
import { getNextOnboardingPath, isOnboardingPath } from './flow'

describe('onboarding route flow', () => {
  it('moves each step to its specified successor', () => {
    expect(getNextOnboardingPath('/onboarding/basic-details')).toBe('/onboarding/goals')
    expect(getNextOnboardingPath('/onboarding/medical')).toBe('/onboarding/connect')
  })

  it('recognizes onboarding paths while excluding public and app paths', () => {
    expect(isOnboardingPath('/onboarding/nutrition')).toBe(true)
    expect(isOnboardingPath('/app/dashboard')).toBe(false)
  })
})
