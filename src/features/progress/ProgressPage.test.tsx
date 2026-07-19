import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProgressPage } from './ProgressPage'
import { getProgressSummary } from '@/services/intelligence'
import { getMealLogs } from '@/services/mealService'
import { getProfileBundle, type ProfileBundle } from '@/services/profile'
import { getWorkoutLogs } from '@/services/workoutService'
import { useAuthStore } from '@/stores/auth-store'
import type { HealthSignalRow, MealLog, NuraaScore, WorkoutLog } from '@/types/database'

vi.mock('@/services/intelligence', () => ({
  getProgressSummary: vi.fn(),
}))

vi.mock('@/services/mealService', () => ({
  getMealLogs: vi.fn(),
}))

vi.mock('@/services/profile', () => ({
  getProfileBundle: vi.fn(),
}))

vi.mock('@/services/workoutService', () => ({
  getWorkoutLogs: vi.fn(),
}))

vi.mock('@/lib/date', () => ({
  getCurrentDate: () => new Date('2026-07-18T08:00:00.000Z'),
  getTodayInTimezone: () => '2026-07-18',
  getLocalISODateWithOffset: (daysOffset: number) => daysOffset === -6 ? '2026-07-12' : '2026-07-18',
}))

const testUser = {
  id: 'user-1',
  aud: 'authenticated',
  email: 'lovnish@example.com',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-07-18T00:00:00.000Z',
} as User

const profileBundle: ProfileBundle = {
  profile: {
    id: testUser.id,
    full_name: 'Lovnish Bhatia',
    email: testUser.email ?? null,
    phone: null,
    avatar_url: null,
    date_of_birth: null,
    age: 34,
    gender: 'Male',
    location_city: 'Mumbai',
    location_country: 'India',
    timezone: 'Asia/Kolkata',
    onboarding_completed: true,
    created_at: '2026-07-18T00:00:00.000Z',
    updated_at: '2026-07-18T00:00:00.000Z',
  },
  healthProfile: null,
  goals: [],
  preferences: null,
  permissions: null,
}

const scores = [
  { id: 'score-1', user_id: testUser.id, score_date: '2026-07-17', total_score: 68, readiness_category: 'Steady', score_reason: null, recommended_focus: null, confidence: 70, primary_driver: null, limiting_factor: null, created_at: '2026-07-17T08:00:00.000Z' },
  { id: 'score-2', user_id: testUser.id, score_date: '2026-07-18', total_score: 76, readiness_category: 'Ready', score_reason: null, recommended_focus: null, confidence: 78, primary_driver: null, limiting_factor: null, created_at: '2026-07-18T08:00:00.000Z' },
] as NuraaScore[]

const signals = [
  { id: 'signal-1', user_id: testUser.id, signal_date: '2026-07-17', sleep_score: 72, stress_score: 64, recovery_score: 70, energy_level: 3, sleep_hours: 6.5, sleep_quality: 3, stress_level: 3, soreness_level: 2, motivation_level: 3, mood: 'okay', activity_score: 70, nutrition_score: 70, hydration_score: 70, overall_signal_confidence: 70, raw_signal_json: null, created_at: '2026-07-17T08:00:00.000Z', updated_at: '2026-07-17T08:00:00.000Z' },
  { id: 'signal-2', user_id: testUser.id, signal_date: '2026-07-18', sleep_score: 80, stress_score: 74, recovery_score: 76, energy_level: 4, sleep_hours: 7.1, sleep_quality: 4, stress_level: 2, soreness_level: 1, motivation_level: 4, mood: 'good', activity_score: 70, nutrition_score: 70, hydration_score: 70, overall_signal_confidence: 76, raw_signal_json: null, created_at: '2026-07-18T08:00:00.000Z', updated_at: '2026-07-18T08:00:00.000Z' },
] as HealthSignalRow[]

const meals = [
  { id: 'meal-1', user_id: testUser.id, meal_date: '2026-07-16', meal_type: 'lunch', meal_name: 'Dal rice', calories: 520, protein_g: 28, carbs_g: 70, fat_g: 14, notes: null, logged_at: '2026-07-16T08:00:00.000Z', created_at: '2026-07-16T08:00:00.000Z', updated_at: '2026-07-16T08:00:00.000Z' },
  { id: 'meal-2', user_id: testUser.id, meal_date: '2026-07-18', meal_type: 'dinner', meal_name: 'Paneer bowl', calories: 610, protein_g: 42, carbs_g: 52, fat_g: 22, notes: null, logged_at: '2026-07-18T14:00:00.000Z', created_at: '2026-07-18T14:00:00.000Z', updated_at: '2026-07-18T14:00:00.000Z' },
] as MealLog[]

const workouts = [
  { id: 'workout-1', user_id: testUser.id, workout_date: '2026-07-15', activity_type: 'walk', title: 'Morning walk', duration_minutes: 30, intensity: 'easy', calories_burned: 130, notes: null, completed_at: '2026-07-15T03:30:00.000Z', created_at: '2026-07-15T03:30:00.000Z', updated_at: '2026-07-15T03:30:00.000Z' },
  { id: 'workout-2', user_id: testUser.id, workout_date: '2026-07-18', activity_type: 'strength', title: 'Strength session', duration_minutes: 45, intensity: 'moderate', calories_burned: 210, notes: null, completed_at: '2026-07-18T12:30:00.000Z', created_at: '2026-07-18T12:30:00.000Z', updated_at: '2026-07-18T12:30:00.000Z' },
] as WorkoutLog[]

function renderProgressPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  useAuthStore.setState({ user: testUser, ready: true })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/progress']}>
        <ProgressPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return queryClient
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, ready: false })
})

describe('ProgressPage', () => {
  it('renders manual meal and workout summaries for the selected local range', async () => {
    vi.mocked(getProfileBundle).mockResolvedValue(profileBundle)
    vi.mocked(getProgressSummary).mockResolvedValue({ range: '7d', scores, signals, factors: [], insights: [] })
    vi.mocked(getMealLogs).mockResolvedValue(meals)
    vi.mocked(getWorkoutLogs).mockResolvedValue(workouts)

    renderProgressPage()

    expect(await screen.findByText('Nutrition and movement logs')).toBeInTheDocument()

    const nutritionSection = screen.getByText('Nutrition and movement logs').closest('section')
    expect(nutritionSection).not.toBeNull()
    const scoped = within(nutritionSection as HTMLElement)

    expect(await scoped.findByText('2/7 days with meals')).toBeInTheDocument()
    expect(scoped.getAllByText('2')).toHaveLength(2)
    expect(scoped.getByText('Meals logged')).toBeInTheDocument()
    expect(scoped.getByText('70g')).toBeInTheDocument()
    expect(scoped.getByText('Protein logged')).toBeInTheDocument()
    expect(scoped.getByText('Workout sessions')).toBeInTheDocument()
    expect(scoped.getByText('2/7 days with activity')).toBeInTheDocument()
    expect(scoped.getByText('75')).toBeInTheDocument()
    expect(scoped.getByText('340 kcal logged')).toBeInTheDocument()
  })
})
