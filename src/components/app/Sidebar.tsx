import type { LucideIcon } from 'lucide-react'
import { Crown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { getCoachEligibility } from '@/services/coachService'
import { useAuthStore } from '@/stores/auth-store'
import { appNavigationItems } from './navigation'
import { cn } from '@/lib/utils'

function SidebarItem({ label, to, Icon }: { label: string; to: string; Icon: LucideIcon }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-sage text-nuraa' : 'text-forest/68 hover:bg-sage/60 hover:text-forest')}>
      <Icon size={19} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const user = useAuthStore((state) => state.user)
  const coachEligibility = useQuery({ queryKey: ['coach-eligibility', user?.id], queryFn: getCoachEligibility, enabled: Boolean(user) })
  const showCoach = Boolean(coachEligibility.data?.internalEnabled && coachEligibility.data.internalConsentGranted && coachEligibility.data.coachEnabled)
  const items = appNavigationItems.filter((item) => item.to !== '/app/coach' || showCoach)
  return (
    <aside className="sticky top-0 hidden h-screen w-68 shrink-0 flex-col border-r border-forest/10 bg-white/85 px-5 py-7 backdrop-blur md:flex">
      <Brand />
      <nav className="mt-12 space-y-1" aria-label="Desktop navigation">
        {items.map(({ label, to, icon: Icon }) => <SidebarItem key={to} label={label} to={to} Icon={Icon} />)}
      </nav>
      <div className="mt-auto rounded-3xl border border-sand/80 bg-sand/55 p-4 shadow-sm">
        <Crown className="text-nuraa" size={20} />
        <p className="mt-3 text-sm font-semibold text-forest">Nuraa Pro is on its way</p>
        <p className="mt-1 text-xs leading-5 text-forest/65">Your health foundation is ready for what comes next.</p>
      </div>
    </aside>
  )
}
