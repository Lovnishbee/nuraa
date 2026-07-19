import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { WorkoutsPage } from './WorkoutsPage'
import { getProfileBundle, type ProfileBundle } from '@/services/profile'
import { deleteWorkoutLog, getWorkoutLogs, saveWorkoutLog, updateWorkoutLog } from '@/services/workoutService'
import { useAuthStore } from '@/stores/auth-store'
import type { WorkoutLog } from '@/types/database'

vi.mock('@/services/profile', () => ({
  getProfileBundle: vi.fn(),
}))

vi.mock('@/services/workoutService', () => ({
  deleteWorkoutLog: vi.fn(),
  getWorkoutLogs: vi.fn(),
  saveWorkoutLog: vi.fn(),
  updateWorkoutLog: vi.fn(),
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

const workoutLog: WorkoutLog = {
  id: 'workout-1',
  user_id: testUser.id,
  workout_date: '2026-07-18',
  activity_type: 'walk',
  title: 'Evening walk',
  duration_minutes: 30,
  intensity: 'moderate',
  calories_burned: 160,
  notes: 'Felt steady',
  completed_at: '2026-07-18T13:30:00.000Z',
  created_at: '2026-07-18T13:30:00.000Z',
  updated_at: '2026-07-18T13:30:00.000Z',
}

function renderWorkoutsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  useAuthStore.setState({ user: testUser, ready: true })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/workout']}>
        <WorkoutsPage />
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

describe('WorkoutsPage', () => {
  it('allows a registered user to save a manual workout log', async () => {
    vi.mocked(getProfileBundle).mockResolvedValue(profileBundle)
    vi.mocked(getWorkoutLogs).mockResolvedValue([])
    vi.mocked(saveWorkoutLog).mockResolvedValue(workoutLog)

    renderWorkoutsPage()

    expect(await screen.findByRole('heading', { level: 1, name: /track movement that fits today/i })).toBeInTheDocument()
    expect(await screen.findByText('LB')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: 'Evening walk' } })
    fireEvent.change(screen.getByLabelText(/^duration$/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/^calories$/i), { target: { value: '160' } })
    fireEvent.change(screen.getByLabelText(/^notes$/i), { target: { value: 'Felt steady' } })
    fireEvent.click(screen.getByRole('button', { name: /save workout/i }))

    await waitFor(() => {
      expect(saveWorkoutLog).toHaveBeenCalledWith(testUser.id, expect.objectContaining({
        activityType: 'walk',
        title: 'Evening walk',
        durationMinutes: 30,
        intensity: 'moderate',
        caloriesBurned: 160,
        notes: 'Felt steady',
        timezone: 'Asia/Kolkata',
      }))
    })
  })

  it('allows a registered user to edit and delete an existing workout log', async () => {
    vi.mocked(getProfileBundle).mockResolvedValue(profileBundle)
    vi.mocked(getWorkoutLogs).mockResolvedValue([workoutLog])
    vi.mocked(updateWorkoutLog).mockResolvedValue({ ...workoutLog, title: 'Mobility reset' })
    vi.mocked(deleteWorkoutLog).mockResolvedValue(undefined)

    renderWorkoutsPage()

    expect(await screen.findByText('Evening walk')).toBeInTheDocument()
    expect(await screen.findByText('LB')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /edit evening walk/i }))
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: 'Mobility reset' } })
    fireEvent.click(screen.getByRole('button', { name: /update workout/i }))

    await waitFor(() => {
      expect(updateWorkoutLog).toHaveBeenCalledWith(testUser.id, workoutLog.id, expect.objectContaining({
        title: 'Mobility reset',
        timezone: 'Asia/Kolkata',
      }))
    })

    fireEvent.click(screen.getByRole('button', { name: /delete evening walk/i }))

    await waitFor(() => {
      expect(deleteWorkoutLog).toHaveBeenCalledWith(testUser.id, workoutLog.id)
    })
  })
})
