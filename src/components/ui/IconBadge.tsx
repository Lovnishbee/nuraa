import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function IconBadge({ icon: Icon, tone = 'nuraa', className }: { icon: LucideIcon; tone?: 'nuraa' | 'blue' | 'amber' | 'violet' | 'sand' | 'white'; className?: string }) {
  const toneClass = {
    nuraa: 'bg-sage text-nuraa',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    sand: 'bg-sand/70 text-forest',
    white: 'bg-white/12 text-white',
  }[tone]

  return <span className={cn('grid size-10 shrink-0 place-items-center rounded-[14px]', toneClass, className)}><Icon size={20} strokeWidth={1.9} /></span>
}
