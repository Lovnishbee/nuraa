import type { LucideIcon } from 'lucide-react'
import { HeartPulse } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { appNavigationItems } from './navigation'
import { cn } from '@/lib/utils'

function SidebarItem({ label, to, Icon }: { label: string; to: string; Icon: LucideIcon }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-forest text-white shadow-[0_10px_24px_rgba(22,52,47,.12)]' : 'text-forest/68 hover:bg-sage/70 hover:text-forest')}>
      <Icon size={19} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-68 shrink-0 flex-col border-r border-forest/10 bg-white/86 px-5 py-7 shadow-[18px_0_48px_rgba(22,52,47,.04)] backdrop-blur-xl md:flex">
      <Brand />
      <nav className="mt-12 space-y-1" aria-label="Desktop navigation">
        {appNavigationItems.map(({ label, to, icon: Icon }) => <SidebarItem key={to} label={label} to={to} Icon={Icon} />)}
      </nav>
      <div className="mt-auto rounded-[24px] border border-forest/8 bg-sage/60 p-4">
        <HeartPulse className="text-nuraa" size={20} />
        <p className="mt-3 text-sm font-semibold text-forest">Daily loop</p>
        <p className="mt-1 text-xs leading-5 text-forest/65">Check in, review your signal, and keep one next step visible.</p>
      </div>
    </aside>
  )
}
