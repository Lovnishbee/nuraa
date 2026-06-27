import type { ProfileBundle } from '@/services/profile'
import { isOnboardingPath, onboardingSteps, type OnboardingPath } from './flow'

const ONBOARDING_RESUME_PREFIX = 'nuraa:onboarding:resume:'
export const DASHBOARD_PATH = '/app/dashboard'

function isCompleteValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined && value !== ''
}

function laterOnboardingPath(first: OnboardingPath, second: OnboardingPath) {
  return onboardingSteps.indexOf(first) > onboardingSteps.indexOf(second) ? first : second
}

export function getInferredOnboardingResumePath(bundle: ProfileBundle): OnboardingPath {
  const { profile, healthProfile, goals, preferences } = bundle

  if (!isCompleteValue(profile.full_name) || !isCompleteValue(profile.age) || !isCompleteValue(profile.gender) || !isCompleteValue(healthProfile?.height_cm) || !isCompleteValue(healthProfile?.weight_kg)) {
    return '/onboarding/basic-details'
  }

  if (!goals.length) return '/onboarding/goals'

  if (!preferences || !isCompleteValue(preferences.work_type) || !isCompleteValue(preferences.work_schedule) || !isCompleteValue(preferences.travel_frequency) || preferences.commute_minutes === null || preferences.commute_minutes === undefined) {
    return '/onboarding/lifestyle'
  }

  if (!isCompleteValue(preferences.diet_preference) || !preferences.cuisine_preferences.length) {
    return '/onboarding/nutrition'
  }

  return '/onboarding/medical'
}

export function getStoredOnboardingResumePath(userId: string): OnboardingPath | null {
  try {
    const value = window.localStorage.getItem(`${ONBOARDING_RESUME_PREFIX}${userId}`)
    return value && isOnboardingPath(value) ? value : null
  } catch {
    return null
  }
}

export function saveOnboardingResumePath(userId: string, path: OnboardingPath) {
  try {
    window.localStorage.setItem(`${ONBOARDING_RESUME_PREFIX}${userId}`, path)
  } catch {
    // Local storage is a resume convenience only. Supabase data remains source of truth.
  }
}

export function clearOnboardingResumePath(userId: string) {
  try {
    window.localStorage.removeItem(`${ONBOARDING_RESUME_PREFIX}${userId}`)
  } catch {
    // Local storage is a resume convenience only. Supabase data remains source of truth.
  }
}

export function getPostAuthDestination(bundle: ProfileBundle, storedResumePath: OnboardingPath | null = null) {
  if (bundle.profile.onboarding_completed) return DASHBOARD_PATH

  const inferredPath = getInferredOnboardingResumePath(bundle)
  return storedResumePath ? laterOnboardingPath(storedResumePath, inferredPath) : inferredPath
}
