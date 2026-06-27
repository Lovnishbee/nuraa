import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NotificationBell({ hasUnread = false, className }: { hasUnread?: boolean; className?: string }) {
  return (
    <button type="button" aria-label="Notifications" className={cn('relative grid size-11 place-items-center rounded-2xl border border-forest/10 bg-white text-forest shadow-sm transition hover:border-nuraa/30 hover:text-nuraa', className)}>
      <Bell size={18} />
      {hasUnread && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-rose-500 ring-2 ring-white" />}
    </button>
  )
}
