import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({ title, description, icon: Icon = Sparkles, image, className }: { title: string; description: string; icon?: LucideIcon; image?: string; className?: string }) {
  return (
    <div role="status" className={cn('rounded-3xl border border-dashed border-forest/15 bg-sage/40 p-5 text-center', className)}>
      {image ? <img src={image} alt="" className="mx-auto h-24 w-24 rounded-3xl object-cover object-top" /> : <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-nuraa"><Icon size={22} /></span>}
      <p className="mt-4 font-semibold text-forest">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink/60">{description}</p>
    </div>
  )
}
