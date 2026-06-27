import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MetricTile({ label, value, detail, icon: Icon, tone = 'nuraa' }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: 'nuraa' | 'blue' | 'amber' | 'violet' }) {
  const toneClass = {
    nuraa: 'bg-sage text-nuraa',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  }[tone]

  return (
    <div className="rounded-3xl border border-forest/10 bg-white p-4">
      <span className={cn('grid size-10 place-items-center rounded-2xl', toneClass)}><Icon size={20} /></span>
      <p className="mt-5 text-2xl font-bold text-forest">{value}</p>
      <p className="text-sm font-semibold text-forest/70">{label}</p>
      {detail && <p className="mt-1 text-xs text-ink/55">{detail}</p>}
    </div>
  )
}
