import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { getCoachEligibility } from '@/services/coachService'
import { getProfileBundle, updateProfileFoundation, type ProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@/services/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/services/coachService', () => ({
  getCoachEligibility: vi.fn(),
  setCoachConsent: vi.fn(),
  updateCoachResponseDetail: vi.fn(),
}))

vi.mock('@/services/profile', () => ({
  getProfileBundle: vi.fn(),
  updateProfileFoundation: vi.fn(),
}))

const testUser = {
  id: 'user-1',
  aud: 'authenticated',
  email: 'lovnish@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Lovnish Bhatia' },
  created_at: '2026-07-18T00:00:00.000Z',
} as User

function makeBundle(overrides: Partial<ProfileBundle> = {}): ProfileBundle {
  const bundle: ProfileBundle = {
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
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
    },
    healthProfile: {
      id: 'health-1',
      user_id: testUser.id,
      height_cm: 175,
      weight_kg: 72,
      target_weight_kg: null,
      activity_level: 'moderate',
      fitness_level: 'beginner',
      medical_conditions: [],
      injuries: ['old knee strain'],
      allergies: ['peanuts'],
      dietary_restrictions: ['gluten-free'],
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
    },
    goals: [
      { id: 'goal-1', user_id: testUser.id, goal_type: 'improve_energy', goal_label: 'Improve Energy', priority: 1, status: 'active', created_at: '2026-06-25T00:00:00.000Z' },
    ],
    preferences: {
      id: 'preferences-1',
      user_id: testUser.id,
      diet_preference: 'vegetarian',
      cuisine_preferences: ['Indian'],
      disliked_foods: ['olives'],
      preferred_workout_types: [],
      available_equipment: [],
      preferred_workout_time: null,
      work_type: 'desk work',
      work_schedule: '9 to 6',
      commute_minutes: 30,
      travel_frequency: 'sometimes',
      notification_preference: null,
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
    },
    permissions: null,
  }

  return { ...bundle, ...overrides }
}

function renderProfilePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({ user: testUser, ready: true })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/profile']}>
        <ProfilePage />
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

describe('ProfilePage', () => {
  it('allows users to edit their basic profile and health foundation', async () => {
    const initialBundle = makeBundle()
    const updatedBundle = makeBundle({
      profile: {
        ...initialBundle.profile,
        full_name: 'Lovnish Bee',
        phone: '+91 90000 00000',
        location_city: 'Delhi',
      },
      healthProfile: {
        ...initialBundle.healthProfile!,
        weight_kg: 70,
        target_weight_kg: 68,
        medical_conditions: ['Thyroid'],
        allergies: ['peanuts', 'shellfish'],
        injuries: ['shoulder'],
        dietary_restrictions: ['gluten-free', 'dairy-free'],
      },
      goals: [
        { id: 'goal-1', user_id: testUser.id, goal_type: 'improve_energy', goal_label: 'Improve Energy', priority: 1, status: 'active', created_at: '2026-06-25T00:00:00.000Z' },
        { id: 'goal-2', user_id: testUser.id, goal_type: 'better_sleep', goal_label: 'Better Sleep', priority: 2, status: 'active', created_at: '2026-06-25T00:00:00.000Z' },
      ],
      preferences: {
        ...initialBundle.preferences!,
        diet_preference: 'high protein vegetarian',
        cuisine_preferences: ['Indian', 'Thai'],
        disliked_foods: ['olives', 'mushrooms'],
        work_type: 'consulting',
        commute_minutes: 20,
      },
    })

    vi.mocked(getProfileBundle).mockResolvedValue(initialBundle)
    vi.mocked(getCoachEligibility).mockResolvedValue({ internalEnabled: false, internalConsentGranted: false, coachEnabled: true, responseDetail: 'balanced' })
    vi.mocked(updateProfileFoundation).mockResolvedValue(updatedBundle)
    const queryClient = renderProfilePage()

    expect(await screen.findByRole('heading', { level: 1, name: /health profile/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }))

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Lovnish Bee' } })
    fireEvent.change(screen.getByLabelText(/^phone$/i), { target: { value: '+91 90000 00000' } })
    fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: 'Delhi' } })
    fireEvent.change(screen.getByLabelText(/^weight/i), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText(/target weight/i), { target: { value: '68' } })
    fireEvent.click(screen.getByRole('button', { name: /better sleep/i }))
    fireEvent.click(screen.getByRole('button', { name: /^thyroid$/i }))
    fireEvent.change(screen.getByLabelText(/^allergies$/i), { target: { value: 'peanuts, shellfish' } })
    fireEvent.change(screen.getByLabelText(/^injuries$/i), { target: { value: 'shoulder' } })
    fireEvent.change(screen.getByLabelText(/dietary restrictions/i), { target: { value: 'gluten-free, dairy-free' } })
    fireEvent.change(screen.getByLabelText(/occupation/i), { target: { value: 'consulting' } })
    fireEvent.change(screen.getByLabelText(/commute minutes/i), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/diet preference/i), { target: { value: 'high protein vegetarian' } })
    fireEvent.change(screen.getByLabelText(/cuisine preferences/i), { target: { value: 'Indian, Thai' } })
    fireEvent.change(screen.getByLabelText(/disliked foods/i), { target: { value: 'olives, mushrooms' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateProfileFoundation).toHaveBeenCalledWith(testUser.id, expect.objectContaining({
        fullName: 'Lovnish Bee',
        phone: '+91 90000 00000',
        locationCity: 'Delhi',
        weightKg: 70,
        targetWeightKg: 68,
        goalLabels: ['Improve Energy', 'Better Sleep'],
        medicalConditions: ['Thyroid'],
        allergies: ['peanuts', 'shellfish'],
        injuries: ['shoulder'],
        dietaryRestrictions: ['gluten-free', 'dairy-free'],
        workType: 'consulting',
        commuteMinutes: 20,
        dietPreference: 'high protein vegetarian',
        cuisinePreferences: ['Indian', 'Thai'],
        dislikedFoods: ['olives', 'mushrooms'],
      }))
    })

    expect(await screen.findByText('Lovnish Bee')).toBeInTheDocument()
    expect(queryClient.getQueryData<ProfileBundle>(['profile', testUser.id])?.profile.location_city).toBe('Delhi')
    expect(queryClient.getQueryData<ProfileBundle>(['profile', testUser.id])?.preferences?.diet_preference).toBe('high protein vegetarian')
    expect(queryClient.getQueryData<ProfileBundle>(['profile', testUser.id])?.goals.map((goal) => goal.goal_label)).toEqual(['Improve Energy', 'Better Sleep'])
  })
})
