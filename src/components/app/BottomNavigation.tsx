import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
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
  const items = appNavigationItems.filter((item) => !('mobileHidden' in item && item.mobileHidden))
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-18 max-w-md items-center justify-around border-t border-forest/10 bg-white/96 px-2 shadow-[0_-18px_44px_rgba(22,52,47,.08)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
      {items.map(({ label, to, icon: Icon }) => <BottomNavItem key={to} label={label} to={to} Icon={Icon} />)}
    </nav>
  )
}
