import { render, screen } from '@testing-library/react'
import type React from 'react'
import { MemoryRouter, Outlet } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('@/features/auth/AuthProvider', () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('./RouteGuards', () => ({ ProtectedRoute: () => <Outlet /> }))
vi.mock('@/layouts/PublicLayout', () => ({ PublicLayout: () => <Outlet /> }))
vi.mock('@/layouts/OnboardingLayout', () => ({ OnboardingLayout: () => <Outlet /> }))
vi.mock('@/layouts/AppLayout', () => ({ AppLayout: () => <Outlet /> }))

vi.mock('@/pages/LandingPage', () => ({ LandingPage: () => <div>Landing page</div> }))
vi.mock('@/pages/AuthPage', () => ({ AuthPage: ({ mode }: { mode: string }) => <div>Auth {mode}</div> }))
vi.mock('@/pages/ComponentPlaygroundPage', () => ({ ComponentPlaygroundPage: () => <div>Component playground route</div> }))

vi.mock('@/features/ai/dev/AIRuntimeDevPage', () => ({ AIRuntimeDevPage: () => <div>AI runtime route</div> }))
vi.mock('@/features/proactive/dev/ProactiveIntelligenceDevPage', () => ({ ProactiveIntelligenceDevPage: () => <div>Proactive intelligence route</div> }))
vi.mock('@/features/checkin/DailyCheckInPage', () => ({ DailyCheckInPage: () => <div>Check-in route</div> }))
vi.mock('@/features/coach/CoachPage', () => ({ CoachPage: () => <div>Coach route</div> }))
vi.mock('@/features/dashboard/DashboardPage', () => ({ DashboardPage: () => <div>Dashboard route</div> }))
vi.mock('@/features/meals/MealsPage', () => ({ MealsPage: () => <div>Meals route</div> }))
vi.mock('@/features/onboarding/OnboardingPage', () => ({ OnboardingPage: () => <div>Onboarding route</div> }))
vi.mock('@/features/profile/ProfilePage', () => ({ ProfilePage: () => <div>Profile route</div> }))
vi.mock('@/features/progress/ProgressPage', () => ({ ProgressPage: () => <div>Progress route</div> }))
vi.mock('@/features/reports/ReportsPage', () => ({ ReportsPage: () => <div>Reports route</div> }))
vi.mock('@/features/weekly-reflection/WeeklyReflectionPage', () => ({ WeeklyReflectionPage: () => <div>Weekly reflection route</div> }))
vi.mock('@/features/workouts/WorkoutsPage', () => ({ WorkoutsPage: () => <div>Workouts route</div> }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routes', () => {
  it.each([
    ['/dev/components', 'Component playground route'],
    ['/dev/ai-runtime', 'AI runtime route'],
    ['/dev/proactive-intelligence', 'Proactive intelligence route'],
  ])('registers protected internal route %s', async (_path, expectedText) => {
    renderAt(_path)

    expect(await screen.findByText(expectedText)).toBeInTheDocument()
  })
})
