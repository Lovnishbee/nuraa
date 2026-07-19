import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OnboardingPage } from './OnboardingPage'
import { getNextOnboardingPath, isOnboardingPath } from './flow'
import { getInferredOnboardingResumePath, getPostAuthDestination } from './progress'
import { completeOnboarding, savePermissions } from '@/services/onboarding'
import { getProfileBundle, type ProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@/services/onboarding', () => ({
  completeOnboarding: vi.fn(),
  saveBasicDetails: vi.fn(),
  saveGoals: vi.fn(),
  saveMedical: vi.fn(),
  savePermissions: vi.fn(),
  savePreferences: vi.fn(),
}))

vi.mock('@/services/profile', () => ({
  getProfileBundle: vi.fn(),
}))

const testUser = {
  id: 'user-1',
  aud: 'authenticated',
  email: 'lovnish@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Lovnish From Auth' },
  created_at: '2026-06-25T00:00:00.000Z',
} as User

function makeProfileBundle(overrides: Partial<ProfileBundle> = {}): ProfileBundle {
  const profile = {
    id: testUser.id,
    full_name: 'Lovnish Bhatia',
    email: testUser.email ?? null,
    phone: null,
    avatar_url: null,
    date_of_birth: null,
    age: 34,
    gender: 'Male',
    location_city: null,
    location_country: null,
    timezone: 'Asia/Kolkata',
    onboarding_completed: false,
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
  }
  const healthProfile = {
    id: 'health-1',
    user_id: testUser.id,
    height_cm: 175,
    weight_kg: 70,
    target_weight_kg: null,
    activity_level: null,
    fitness_level: null,
    medical_conditions: [],
    injuries: [],
    allergies: [],
    dietary_restrictions: [],
    created_at: '2026-06-25T00:00:00.000Z',
    updated_at: '2026-06-25T00:00:00.000Z',
  }

  return {
    profile,
    healthProfile,
    goals: [],
    preferences: null,
    permissions: null,
    ...overrides,
  }
}

function renderOnboarding(path: string, bundle = makeProfileBundle()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  useAuthStore.setState({ user: testUser, ready: true })
  queryClient.setQueryData(['profile', testUser.id], bundle)
  vi.mocked(getProfileBundle).mockResolvedValue(bundle)

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/onboarding/basic-details" element={<OnboardingPage />} />
          <Route path="/onboarding/goals" element={<div>Goals step</div>} />
          <Route path="/onboarding/connect" element={<OnboardingPage />} />
          <Route path="/app/dashboard" element={<div>Dashboard landed</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return queryClient
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.localStorage.clear()
  useAuthStore.setState({ user: null, ready: false })
})

describe('onboarding route flow', () => {
  it('moves each step to its specified successor', () => {
    expect(getNextOnboardingPath('/onboarding/basic-details')).toBe('/onboarding/goals')
    expect(getNextOnboardingPath('/onboarding/medical')).toBe('/onboarding/connect')
  })

  it('recognizes onboarding paths while excluding public and app paths', () => {
    expect(isOnboardingPath('/onboarding/nutrition')).toBe(true)
    expect(isOnboardingPath('/app/dashboard')).toBe(false)
  })

  it('infers the next incomplete onboarding stage from saved user data', () => {
    expect(getInferredOnboardingResumePath(makeProfileBundle({ healthProfile: null }))).toBe('/onboarding/basic-details')
    expect(getInferredOnboardingResumePath(makeProfileBundle())).toBe('/onboarding/goals')
    expect(getInferredOnboardingResumePath(makeProfileBundle({ goals: [{ id: 'goal-1', user_id: testUser.id, goal_type: 'energy', goal_label: 'Improve Energy', priority: 1, status: 'active', created_at: '2026-06-25T00:00:00.000Z' }] }))).toBe('/onboarding/lifestyle')
  })

  it('uses the later stored resume path for incomplete users and dashboard for onboarded users', () => {
    const incomplete = makeProfileBundle()
    const completed = makeProfileBundle({ profile: { ...incomplete.profile, onboarding_completed: true } })

    expect(getPostAuthDestination(incomplete, '/onboarding/nutrition')).toBe('/onboarding/nutrition')
    expect(getPostAuthDestination(completed, '/onboarding/nutrition')).toBe('/app/dashboard')
  })
})

describe('onboarding page', () => {
  it('prefills basic details from the saved profile bundle', async () => {
    renderOnboarding('/onboarding/basic-details')

    await waitFor(() => expect(screen.getByLabelText(/full name/i)).toHaveValue('Lovnish Bhatia'))
    expect(screen.getByLabelText(/age/i)).toHaveValue(34)
    expect(screen.getByLabelText(/gender/i)).toHaveValue('Male')
    expect(screen.getByLabelText(/height/i)).toHaveValue(175)
    expect(screen.getByLabelText(/weight/i)).toHaveValue(70)
  })

  it('falls back to the Supabase auth metadata name when the profile name is missing', async () => {
    renderOnboarding('/onboarding/basic-details', makeProfileBundle({ profile: { ...makeProfileBundle().profile, full_name: null } }))

    await waitFor(() => expect(screen.getByLabelText(/full name/i)).toHaveValue('Lovnish From Auth'))
  })

  it('does not navigate away from the final step when completion fails', async () => {
    vi.mocked(savePermissions).mockResolvedValue(undefined)
    vi.mocked(completeOnboarding).mockRejectedValue(new Error('Unable to complete onboarding'))
    renderOnboarding('/onboarding/connect')

    fireEvent.click(screen.getByRole('button', { name: /finish setup/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to complete onboarding')
    expect(screen.queryByText('Dashboard landed')).not.toBeInTheDocument()
  })

  it('updates the cached profile and navigates to the dashboard after final completion', async () => {
    const initialBundle = makeProfileBundle()
    const completedBundle = makeProfileBundle({ profile: { ...initialBundle.profile, onboarding_completed: true } })
    vi.mocked(savePermissions).mockResolvedValue(undefined)
    vi.mocked(completeOnboarding).mockResolvedValue(undefined)
    const queryClient = renderOnboarding('/onboarding/connect', initialBundle)
    vi.mocked(getProfileBundle).mockResolvedValue(completedBundle)

    fireEvent.click(screen.getByRole('button', { name: /finish setup/i }))

    expect(await screen.findByText('Dashboard landed')).toBeInTheDocument()
    await waitFor(() => {
      const cached = queryClient.getQueryData<ProfileBundle>(['profile', testUser.id])
      expect(cached?.profile.onboarding_completed).toBe(true)
    })
  })

  it('stores the next onboarding step after a successful screen save', async () => {
    renderOnboarding('/onboarding/basic-details')

    await waitFor(() => expect(screen.getByLabelText(/full name/i)).toHaveValue('Lovnish Bhatia'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(window.localStorage.getItem(`nuraa:onboarding:resume:${testUser.id}`)).toBe('/onboarding/goals'))
  })
})
