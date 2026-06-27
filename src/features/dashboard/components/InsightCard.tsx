import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'
import { IconBadge } from '@/components/ui/IconBadge'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function InsightCard({ title = 'Learning your routine', description = 'Nuraa gets more helpful as your check-ins build a consistent health baseline.', icon: Icon = Sparkles, status, onRetry }: StatefulWidgetProps & { title?: string; description?: string; icon?: LucideIcon }) {
  return (
    <DashboardCard status={status} onRetry={onRetry} className="bg-sage/55" empty={{ title: 'Insight will appear with more signals.', description: 'Keep checking in so Nuraa can understand what normal feels like for you.' }}>
      <div className="flex items-start gap-4">
        <IconBadge icon={Icon} />
        <div>
          <p className="font-bold text-forest">{title}</p>
          <p className="mt-2 text-sm leading-6 text-ink/62">{description}</p>
        </div>
      </div>
    </DashboardCard>
  )
}
