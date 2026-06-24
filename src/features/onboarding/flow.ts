export const onboardingSteps = [
  '/onboarding/basic-details',
  '/onboarding/goals',
  '/onboarding/lifestyle',
  '/onboarding/nutrition',
  '/onboarding/medical',
  '/onboarding/connect',
] as const

export type OnboardingPath = (typeof onboardingSteps)[number]

export function isOnboardingPath(path: string): path is OnboardingPath {
  return onboardingSteps.includes(path as OnboardingPath)
}

export function getNextOnboardingPath(path: OnboardingPath): OnboardingPath | null {
  const index = onboardingSteps.indexOf(path)
  return onboardingSteps[index + 1] ?? null
}
