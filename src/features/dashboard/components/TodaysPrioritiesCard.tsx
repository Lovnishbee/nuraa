import { todaysPriorityPlaceholders } from '@/constants/dashboard-placeholders'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function TodaysPrioritiesCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard title="Today’s priorities" status={status} onRetry={onRetry} empty={{ title: 'No priorities yet', description: 'Your priorities will adapt after your first daily check-in.' }}>
      <div className="mt-4 divide-y divide-forest/8">
        {todaysPriorityPlaceholders.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sage text-nuraa"><Icon size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-forest">{title}</p>
              <p className="mt-1 text-sm leading-5 text-ink/60">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}
