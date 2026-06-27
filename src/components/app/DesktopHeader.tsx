import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { NotificationBell } from './NotificationBell'
import { ProfileAvatar } from './ProfileAvatar'

export function DesktopHeader({ title, subtitle, userName, avatarUrl }: { title: string; subtitle?: string; userName?: string | null; avatarUrl?: string | null }) {
  return (
    <header className="hidden items-center justify-between gap-6 md:flex">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Nuraa dashboard</p>
        <h1 className="display mt-2 text-4xl leading-none text-forest lg:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink/60">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button asChild variant="secondary" size="sm"><Link to="/app/check-in">Daily check-in</Link></Button>
        <NotificationBell hasUnread />
        <ProfileAvatar name={userName} imageUrl={avatarUrl} />
      </div>
    </header>
  )
}
