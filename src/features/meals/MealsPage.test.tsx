import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MealsPage } from './MealsPage'
import { deleteMealLog, getMealLogs, saveMealLog, updateMealLog } from '@/services/mealService'
import { getProfileBundle, type ProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import type { MealLog } from '@/types/database'

vi.mock('@/services/mealService', () => ({
  deleteMealLog: vi.fn(),
  getMealLogs: vi.fn(),
  saveMealLog: vi.fn(),
  updateMealLog: vi.fn(),
}))

vi.mock('@/services/profile', () => ({
  getProfileBundle: vi.fn(),
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

const mealLog: MealLog = {
  id: 'meal-1',
  user_id: testUser.id,
  meal_date: '2026-07-18',
  meal_type: 'lunch',
  meal_name: 'Paneer bowl',
  notes: 'Homemade',
  calories: 520,
  protein_g: 32,
  carbs_g: 58,
  fat_g: 18,
  logged_at: '2026-07-18T07:00:00.000Z',
  created_at: '2026-07-18T07:00:00.000Z',
  updated_at: '2026-07-18T07:00:00.000Z',
}

function renderMealsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  useAuthStore.setState({ user: testUser, ready: true })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/meals']}>
        <MealsPage />
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

describe('MealsPage', () => {
  it('allows a registered user to save a manual meal log', async () => {
    vi.mocked(getProfileBundle).mockResolvedValue(profileBundle)
    vi.mocked(getMealLogs).mockResolvedValue([])
    vi.mocked(saveMealLog).mockResolvedValue(mealLog)

    renderMealsPage()

    expect(await screen.findByRole('heading', { level: 1, name: /log meals without judgement/i })).toBeInTheDocument()
    expect(await screen.findByText('LB')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/meal name/i), { target: { value: 'Paneer bowl' } })
    fireEvent.change(screen.getByLabelText(/^calories$/i), { target: { value: '520' } })
    fireEvent.change(screen.getByLabelText(/^protein$/i), { target: { value: '32' } })
    fireEvent.change(screen.getByLabelText(/^notes$/i), { target: { value: 'Homemade' } })
    fireEvent.click(screen.getByRole('button', { name: /save meal/i }))

    await waitFor(() => {
      expect(saveMealLog).toHaveBeenCalledWith(testUser.id, expect.objectContaining({
        mealType: 'lunch',
        mealName: 'Paneer bowl',
        calories: 520,
        proteinG: 32,
        notes: 'Homemade',
        timezone: 'Asia/Kolkata',
      }))
    })
  })

  it('allows a registered user to edit and delete an existing meal log', async () => {
    vi.mocked(getProfileBundle).mockResolvedValue(profileBundle)
    vi.mocked(getMealLogs).mockResolvedValue([mealLog])
    vi.mocked(updateMealLog).mockResolvedValue({ ...mealLog, meal_name: 'Khichdi' })
    vi.mocked(deleteMealLog).mockResolvedValue(undefined)

    renderMealsPage()

    expect(await screen.findByText('Paneer bowl')).toBeInTheDocument()
    expect(await screen.findByText('LB')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /edit paneer bowl/i }))
    fireEvent.change(screen.getByLabelText(/meal name/i), { target: { value: 'Khichdi' } })
    fireEvent.click(screen.getByRole('button', { name: /update meal/i }))

    await waitFor(() => {
      expect(updateMealLog).toHaveBeenCalledWith(testUser.id, mealLog.id, expect.objectContaining({
        mealName: 'Khichdi',
        timezone: 'Asia/Kolkata',
      }))
    })

    fireEvent.click(screen.getByRole('button', { name: /delete paneer bowl/i }))

    await waitFor(() => {
      expect(deleteMealLog).toHaveBeenCalledWith(testUser.id, mealLog.id)
    })
  })
})
