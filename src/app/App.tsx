import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AIRuntimeDevPage } from '@/features/ai/dev/AIRuntimeDevPage'
import { DailyCheckInPage } from '@/features/checkin/DailyCheckInPage'
import { CoachPage } from '@/features/coach/CoachPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProgressPage } from '@/features/progress/ProgressPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { AppLayout } from '@/layouts/AppLayout'
import { OnboardingLayout } from '@/layouts/OnboardingLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthPage } from '@/pages/AuthPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { ComponentPlaygroundPage } from '@/pages/ComponentPlaygroundPage'
import { LandingPage } from '@/pages/LandingPage'
import { ProtectedRoute } from './RouteGuards'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
              <Route path="/app/coach" element={<CoachPage />} />
              <Route path="/app/progress" element={<ProgressPage />} />
              <Route path="/app/reports" element={<ReportsPage />} />
              <Route path="/app/profile" element={<ProfilePage />} />
              <Route path="/dev/components" element={<ComponentPlaygroundPage />} />
              <Route path="/dev/ai-runtime" element={<AIRuntimeDevPage />} />
              <Route path="/app/:feature" element={<ComingSoonPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  )
}
