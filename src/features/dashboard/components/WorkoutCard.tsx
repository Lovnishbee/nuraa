import { Dumbbell, Footprints } from 'lucide-react'
import movementIllustration from '@/assets/dashboard/movement_illustration.png'
import { IconBadge } from '@/components/ui/IconBadge'
import { dashboardEmptyStates } from '@/constants/dashboard-content'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function WorkoutCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard title="Movement" status={status} onRetry={onRetry} empty={{ ...dashboardEmptyStates.movement, image: movementIllustration }}>
      <div className="mt-5 grid grid-cols-[auto_1fr] gap-4">
        <IconBadge icon={Footprints} />
        <div>
          <p className="text-3xl font-bold text-forest">4,650</p>
          <p className="text-sm text-ink/60">movement rhythm forming</p>
        </div>
      </div>
      <div className="mt-5 h-2 rounded-full bg-sage"><div className="h-full w-[66%] rounded-full bg-nuraa" /></div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-forest/72"><Dumbbell size={16} strokeWidth={1.9} /> Guidance unlocks as you log more signals.</div>
    </DashboardCard>
  )
}
