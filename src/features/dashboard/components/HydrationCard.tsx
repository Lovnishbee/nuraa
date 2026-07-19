import { Droplets } from 'lucide-react'
import hydrationIllustration from '@/assets/dashboard/hydration_illustration.png'
import { dashboardEmptyStates } from '@/constants/dashboard-content'
import { IconBadge } from '@/components/ui/IconBadge'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function HydrationCard({ litres, score, status, onRetry }: StatefulWidgetProps & { litres?: number | null; score?: number | null }) {
  const progress = Math.min(Math.max(((litres ?? 0) / 2.5) * 100, 0), 100)

  return (
    <DashboardCard title="Hydration" status={status} onRetry={onRetry} empty={{ ...dashboardEmptyStates.hydration, image: hydrationIllustration }}>
      <div className="mt-5 flex items-center gap-4">
        <IconBadge icon={Droplets} tone="blue" />
        <div>
          <p className="text-3xl font-bold text-forest">{litres ? `${litres.toFixed(1)} L` : '—'}</p>
          <p className="text-sm text-ink/60">{score ? `${score}/100 hydration signal` : 'Log water in check-in'}</p>
        </div>
      </div>
      <div className="mt-5 h-2 rounded-full bg-blue-50"><div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} /></div>
    </DashboardCard>
  )
}
