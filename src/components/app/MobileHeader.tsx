import { Brand } from '@/components/Brand'
import { NotificationBell } from './NotificationBell'
import { ProfileAvatar } from './ProfileAvatar'

export function MobileHeader({ userName, avatarUrl }: { userName?: string | null; avatarUrl?: string | null }) {
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-5 flex items-center justify-between border-b border-forest/8 bg-canvas/92 px-5 py-3 backdrop-blur md:hidden">
      <Brand compact />
      <div className="flex items-center gap-2">
        <NotificationBell hasUnread className="size-10 rounded-xl" />
        <ProfileAvatar name={userName} imageUrl={avatarUrl} className="size-10" />
      </div>
    </header>
  )
}
