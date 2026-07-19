import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ReportsPage } from './ReportsPage'
import { getInsightsSummary } from '@/services/intelligence'
import { getMealLogs } from '@/services/mealService'
import { getProfileBundle, type ProfileBundle } from '@/services/profile'
import { getWorkoutLogs } from '@/services/workoutService'
import { useAuthStore } from '@/stores/auth-store'
import type { DailyBriefRow, MealLog, NuraaScore, ScoreFactor, WorkoutLog } from '@/types/database'

vi.mock('@/services/intelligence', () => ({
  getInsightsSummary: vi.fn(),
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

const brief = {
  id: 'brief-1',
  user_id: testUser.id,
  brief_date: '2026-07-18',
  headline: 'A steadier week is forming.',
  summary: 'Your recent check-ins show a usable baseline.',
  focus_items: [{ title: 'Protect sleep', description: 'Keep your wind-down window steady.', category: 'sleep' }],
  insight: 'Personalised reports unlock as Nuraa learns more about your routine.',
  tone: 'supportive',
  source: 'deterministic',
  created_at: '2026-07-18T08:00:00.000Z',
  updated_at: '2026-07-18T08:00:00.000Z',
} as DailyBriefRow

const score = {
  id: 'score-1',
  user_id: testUser.id,
  score_date: '2026-07-18',
  total_score: 76,
  readiness_category: 'Ready',
  score_reason: 'Your baseline is stable enough for normal activity.',
  recommended_focus: 'Sleep consistency',
  confidence: 78,
  primary_driver: 'sleep',
  limiting_factor: 'stress',
  created_at: '2026-07-18T08:00:00.000Z',
} as NuraaScore

const factors = {
  id: 'factor-1',
  user_id: testUser.id,
  score_date: '2026-07-18',
  sleep_score: 80,
  stress_score: 72,
  recovery_score: 74,
  activity_score: 70,
  nutrition_score: 70,
  hydration_score: 70,
  confidence: 78,
  primary_driver: 'sleep',
  limiting_factor: 'stress',
  created_at: '2026-07-18T08:00:00.000Z',
} as ScoreFactor

const meals = [
  { id: 'meal-1', user_id: testUser.id, meal_date: '2026-07-16', meal_type: 'lunch', meal_name: 'Dal rice', calories: 520, protein_g: 28, carbs_g: 70, fat_g: 14, notes: null, logged_at: '2026-07-16T08:00:00.000Z', created_at: '2026-07-16T08:00:00.000Z', updated_at: '2026-07-16T08:00:00.000Z' },
  { id: 'meal-2', user_id: testUser.id, meal_date: '2026-07-18', meal_type: 'dinner', meal_name: 'Paneer bowl', calories: 610, protein_g: 42, carbs_g: 52, fat_g: 22, notes: null, logged_at: '2026-07-18T14:00:00.000Z', created_at: '2026-07-18T14:00:00.000Z', updated_at: '2026-07-18T14:00:00.000Z' },
  { id: 'meal-3', user_id: testUser.id, meal_date: '2026-07-10', meal_type: 'breakfast', meal_name: 'Outside range', calories: 900, protein_g: 50, carbs_g: 90, fat_g: 30, notes: null, logged_at: '2026-07-10T04:00:00.000Z', created_at: '2026-07-10T04:00:00.000Z', updated_at: '2026-07-10T04:00:00.000Z' },
] as MealLog[]

const workouts = [
  { id: 'workout-1', user_id: testUser.id, workout_date: '2026-07-15', activity_type: 'walk', title: 'Morning walk', duration_minutes: 30, intensity: 'easy', calories_burned: 130, notes: null, completed_at: '2026-07-15T03:30:00.000Z', created_at: '2026-07-15T03:30:00.000Z', updated_at: '2026-07-15T03:30:00.000Z' },
  { id: 'workout-2', user_id: testUser.id, workout_date: '2026-07-18', activity_type: 'strength', title: 'Strength session', duration_minutes: 45, intensity: 'moderate', calories_burned: 210, notes: null, completed_at: '2026-07-18T12:30:00.000Z', created_at: '2026-07-18T12:30:00.000Z', updated_at: '2026-07-18T12:30:00.000Z' },
] as WorkoutLog[]

function renderReportsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  useAuthStore.setState({ user: testUser, ready: true })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/reports']}>
        <ReportsPage />
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

describe('ReportsPage', () => {
  it('renders weekly meal and movement summary from manual logs', async () => {
    vi.mocked(getProfileBundle).mockResolvedValue(profileBundle)
    vi.mocked(getInsightsSummary).mockResolvedValue({ brief, score, signal: null, factors, insights: [] })
    vi.mocked(getMealLogs).mockResolvedValue(meals)
    vi.mocked(getWorkoutLogs).mockResolvedValue(workouts)

    renderReportsPage()

    expect(await screen.findByText('Meals and movement summary')).toBeInTheDocument()

    const summarySection = screen.getByText('Meals and movement summary').closest('section')
    expect(summarySection).not.toBeNull()
    const scoped = within(summarySection as HTMLElement)

    expect(await scoped.findByText('2/7 days with meal data')).toBeInTheDocument()
    expect(scoped.getAllByText('2')).toHaveLength(2)
    expect(scoped.getByText('Meals logged')).toBeInTheDocument()
    expect(scoped.getByText('70g')).toBeInTheDocument()
    expect(scoped.getByText('Protein')).toBeInTheDocument()
    expect(scoped.getByText('Workouts')).toBeInTheDocument()
    expect(scoped.getByText('75 minutes logged')).toBeInTheDocument()
    expect(scoped.getByText('340')).toBeInTheDocument()
    expect(scoped.getByText('Activity calories')).toBeInTheDocument()
  })
})
