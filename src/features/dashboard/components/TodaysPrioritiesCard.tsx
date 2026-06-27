import { todaysFocusItems } from '@/constants/dashboard-content'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function TodayFocusCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard title="Today’s Focus" status={status} onRetry={onRetry} className="p-6" empty={{ title: 'Your focus will sharpen soon.', description: 'Check in daily so Nuraa can suggest the right next step for your body.' }}>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {todaysFocusItems.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-[22px] border border-forest/8 bg-canvas/70 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-sage text-nuraa"><Icon size={20} strokeWidth={1.9} /></span>
            <div className="min-w-0 flex-1">
              <p className="mt-4 font-semibold text-forest">{title}</p>
              <p className="mt-1 text-sm leading-5 text-ink/64">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

export { TodayFocusCard as TodaysPrioritiesCard }
