import { Droplets } from 'lucide-react'
import hydrationIllustration from '@/assets/dashboard/hydration_illustration.png'
import { dashboardEmptyStates } from '@/constants/dashboard-content'
import { IconBadge } from '@/components/ui/IconBadge'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function HydrationCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard title="Hydration" status={status} onRetry={onRetry} empty={{ ...dashboardEmptyStates.hydration, image: hydrationIllustration }}>
      <div className="mt-5 flex items-center gap-4">
        <IconBadge icon={Droplets} tone="blue" />
        <div>
          <p className="text-3xl font-bold text-forest">1.6 L</p>
          <p className="text-sm text-ink/60">daily rhythm forming</p>
        </div>
      </div>
      <div className="mt-5 h-2 rounded-full bg-blue-50"><div className="h-full w-[64%] rounded-full bg-blue-500" /></div>
    </DashboardCard>
  )
}
