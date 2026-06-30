import type { LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'
import { getCoachEligibility } from '@/services/coachService'
import { useAuthStore } from '@/stores/auth-store'
import { appNavigationItems } from './navigation'
import { cn } from '@/lib/utils'

function BottomNavItem({ label, to, Icon }: { label: string; to: string; Icon: LucideIcon }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn('flex min-w-10 flex-col items-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-semibold transition', isActive ? 'text-nuraa' : 'text-forest/55')}>
      <Icon size={19} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  )
}

export function BottomNavigation() {
  const user = useAuthStore((state) => state.user)
  const coachEligibility = useQuery({ queryKey: ['coach-eligibility', user?.id], queryFn: getCoachEligibility, enabled: Boolean(user) })
  const showCoach = Boolean(coachEligibility.data?.internalEnabled && coachEligibility.data.internalConsentGranted && coachEligibility.data.coachEnabled)
  const items = appNavigationItems.filter((item) => !('desktopOnly' in item && item.desktopOnly)).filter((item) => item.to !== '/app/coach' || showCoach)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-18 items-center justify-around border-t border-forest/10 bg-white/95 px-1 backdrop-blur md:hidden" aria-label="Mobile navigation">
      {items.map(({ label, to, icon: Icon }) => <BottomNavItem key={to} label={label} to={to} Icon={Icon} />)}
    </nav>
  )
}
