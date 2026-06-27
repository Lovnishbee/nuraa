import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthPage } from './AuthPage'
import { loginWithEmail } from '@/services/auth'
import { getProfileBundle, type ProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
}))

vi.mock('@/services/auth', () => ({
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
}))

vi.mock('@/services/profile', () => ({
  getProfileBundle: vi.fn(),
}))

const testUser = {
  id: 'user-1',
  aud: 'authenticated',
  email: 'lovnish@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Lovnish Bhatia' },
  created_at: '2026-06-25T00:00:00.000Z',
} as User

function makeProfileBundle(onboardingCompleted = false): ProfileBundle {
  return {
    profile: {
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
      onboarding_completed: onboardingCompleted,
      created_at: '2026-06-25T00:00:00.000Z',
      updated_at: '2026-06-25T00:00:00.000Z',
    },
    healthProfile: {
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
    },
    goals: [],
    preferences: null,
    permissions: null,
  }
}

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/onboarding/goals" element={<div>Resume goals</div>} />
          <Route path="/onboarding/nutrition" element={<div>Resume nutrition</div>} />
          <Route path="/app/dashboard" element={<div>Dashboard landed</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return queryClient
}

async function submitLogin() {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'lovnish@example.com' } })
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } })
  fireEvent.click(screen.getByRole('button', { name: /^login$/i }))
}

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  useAuthStore.setState({ user: null, ready: false })
})

describe('AuthPage login', () => {
  it('sets the authenticated user and routes completed users to the dashboard', async () => {
    const bundle = makeProfileBundle(true)
    vi.mocked(loginWithEmail).mockResolvedValue({ data: { session: { user: testUser }, user: testUser }, error: null } as Awaited<ReturnType<typeof loginWithEmail>>)
    vi.mocked(getProfileBundle).mockResolvedValue(bundle)
    const queryClient = renderLogin()

    await submitLogin()

    expect(await screen.findByText('Dashboard landed')).toBeInTheDocument()
    expect(useAuthStore.getState().user?.id).toBe(testUser.id)
    expect(queryClient.getQueryData<ProfileBundle>(['profile', testUser.id])?.profile.onboarding_completed).toBe(true)
  })

  it('routes incomplete users to the stored drop-off step when it is ahead of inferred progress', async () => {
    window.localStorage.setItem(`nuraa:onboarding:resume:${testUser.id}`, '/onboarding/nutrition')
    vi.mocked(loginWithEmail).mockResolvedValue({ data: { session: { user: testUser }, user: testUser }, error: null } as Awaited<ReturnType<typeof loginWithEmail>>)
    vi.mocked(getProfileBundle).mockResolvedValue(makeProfileBundle(false))
    renderLogin()

    await submitLogin()

    expect(await screen.findByText('Resume nutrition')).toBeInTheDocument()
  })
})
