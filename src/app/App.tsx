import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppLayout } from '@/layouts/AppLayout'
import { OnboardingLayout } from '@/layouts/OnboardingLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { ProtectedRoute } from './RouteGuards'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

const LandingPage = lazy(() => import('@/pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const AuthPage = lazy(() => import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const ComponentPlaygroundPage = lazy(() => import('@/pages/ComponentPlaygroundPage').then((module) => ({ default: module.ComponentPlaygroundPage })))
const AIRuntimeDevPage = lazy(() => import('@/features/ai/dev/AIRuntimeDevPage').then((module) => ({ default: module.AIRuntimeDevPage })))
const DailyCheckInPage = lazy(() => import('@/features/checkin/DailyCheckInPage').then((module) => ({ default: module.DailyCheckInPage })))
const CoachPage = lazy(() => import('@/features/coach/CoachPage').then((module) => ({ default: module.CoachPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const MealsPage = lazy(() => import('@/features/meals/MealsPage').then((module) => ({ default: module.MealsPage })))
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then((module) => ({ default: module.OnboardingPage })))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const ProactiveIntelligenceDevPage = lazy(() => import('@/features/proactive/dev/ProactiveIntelligenceDevPage').then((module) => ({ default: module.ProactiveIntelligenceDevPage })))
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage').then((module) => ({ default: module.ProgressPage })))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const WeeklyReflectionPage = lazy(() => import('@/features/weekly-reflection/WeeklyReflectionPage').then((module) => ({ default: module.WeeklyReflectionPage })))
const WorkoutsPage = lazy(() => import('@/features/workouts/WorkoutsPage').then((module) => ({ default: module.WorkoutsPage })))

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={<div className="sr-only" role="status">Loading Nuraa…</div>}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<OnboardingLayout />}>
                <Route path="/onboarding/basic-details" element={<OnboardingPage />} />
                <Route path="/onboarding/goals" element={<OnboardingPage />} />
                <Route path="/onboarding/lifestyle" element={<OnboardingPage />} />
                <Route path="/onboarding/nutrition" element={<OnboardingPage />} />
                <Route path="/onboarding/medical" element={<OnboardingPage />} />
                <Route path="/onboarding/connect" element={<OnboardingPage />} />
              </Route>

              <Route element={<AppLayout />}>
                <Route path="/app/dashboard" element={<DashboardPage />} />
                <Route path="/app/check-in" element={<DailyCheckInPage />} />
                <Route path="/app/meals" element={<MealsPage />} />
                <Route path="/app/workout" element={<WorkoutsPage />} />
                <Route path="/app/coach" element={<CoachPage />} />
                <Route path="/app/progress" element={<ProgressPage />} />
                <Route path="/app/reports" element={<ReportsPage />} />
                <Route path="/app/weekly-reflection" element={<WeeklyReflectionPage />} />
                <Route path="/app/profile" element={<ProfilePage />} />
              </Route>

              <Route path="/dev/components" element={<ComponentPlaygroundPage />} />
              <Route path="/dev/ai-runtime" element={<AIRuntimeDevPage />} />
              <Route path="/dev/proactive-intelligence" element={<ProactiveIntelligenceDevPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  )
}
