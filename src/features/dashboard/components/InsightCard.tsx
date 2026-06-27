import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function InsightCard({ title = 'Insight placeholder', description = 'Nuraa will generate adaptive insights in a later phase. For now, this card proves the reusable insight surface.', icon: Icon = Sparkles, status, onRetry }: StatefulWidgetProps & { title?: string; description?: string; icon?: LucideIcon }) {
  return (
    <DashboardCard status={status} onRetry={onRetry} className="bg-sage/55" empty={{ title: 'No insight yet', description: 'Insights will appear once future intelligence is active.' }}>
      <div className="flex items-start gap-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-white text-nuraa"><Icon size={21} /></span>
        <div>
          <p className="font-bold text-forest">{title}</p>
          <p className="mt-2 text-sm leading-6 text-ink/62">{description}</p>
        </div>
      </div>
    </DashboardCard>
  )
}
