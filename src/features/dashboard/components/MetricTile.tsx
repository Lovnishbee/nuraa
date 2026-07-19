import type { LucideIcon } from 'lucide-react'
import { IconBadge } from '@/components/ui/IconBadge'
import { cn } from '@/lib/utils'

export function MetricTile({ label, value, detail, icon: Icon, tone = 'nuraa' }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: 'nuraa' | 'blue' | 'amber' | 'violet' }) {
  return (
    <div className={cn('rounded-[24px] border border-forest/10 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(22,52,47,.08)]')}>
      <IconBadge icon={Icon} tone={tone} />
      <p className="mt-5 text-2xl font-bold text-forest">{value}</p>
      <p className="text-sm font-semibold text-forest/70">{label}</p>
      {detail && <p className="mt-1 text-xs text-ink/55">{detail}</p>}
    </div>
  )
}
