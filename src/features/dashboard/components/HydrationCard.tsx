import { Droplets } from 'lucide-react'
import hydrationIllustration from '@/assets/dashboard/hydration_illustration.png'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function HydrationCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard title="Hydration" status={status} onRetry={onRetry} empty={{ title: 'Hydration tracking placeholder', description: 'Manual hydration tracking will arrive in a later phase.', image: hydrationIllustration }}>
      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-13 place-items-center rounded-3xl bg-blue-50 text-blue-600"><Droplets size={24} /></span>
        <div>
          <p className="text-3xl font-bold text-forest">1.6 L</p>
          <p className="text-sm text-ink/60">of 2.5 L setup target</p>
        </div>
      </div>
      <div className="mt-5 h-2 rounded-full bg-blue-50"><div className="h-full w-[64%] rounded-full bg-blue-500" /></div>
    </DashboardCard>
  )
}
