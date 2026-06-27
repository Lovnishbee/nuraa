import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProfileAvatar({ name, imageUrl, className }: { name?: string | null; imageUrl?: string | null; className?: string }) {
  const initials = name?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || ''

  return (
    <span className={cn('grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-sage text-sm font-bold text-nuraa ring-1 ring-forest/10', className)}>
      {imageUrl ? <img src={imageUrl} alt={name ? `${name} avatar` : 'Profile avatar'} className="h-full w-full object-cover" /> : initials || <UserRound size={19} />}
    </span>
  )
}
