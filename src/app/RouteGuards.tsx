import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getPostAuthDestination, getStoredOnboardingResumePath } from '@/features/onboarding/progress'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getOrCreateProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'

function LoadingGate() {
  return <div className="grid min-h-screen place-items-center bg-canvas"><p className="text-sm font-semibold text-forest/60">Preparing Nuraa…</p></div>
}

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user)
  const ready = useAuthStore((state) => state.ready)
  const location = useLocation()
  const profile = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getOrCreateProfileBundle(user!),
    enabled: Boolean(user && isSupabaseConfigured),
  })

  if (!ready || profile.isLoading) return <LoadingGate />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profile.error) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <p className="max-w-md text-sm leading-6 text-forest">We could not load your secure profile. Confirm the Phase 1 migration has been applied to your Supabase project, then try again.</p>
      </div>
    )
  }

  if (!profile.data) return <LoadingGate />

  const destination = getPostAuthDestination(profile.data, getStoredOnboardingResumePath(user.id))

  if (!profile.data.profile.onboarding_completed && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to={destination} replace />
  }

  if (profile.data.profile.onboarding_completed && location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
