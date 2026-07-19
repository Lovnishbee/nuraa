import { Moon } from 'lucide-react'
import sleepIllustration from '@/assets/dashboard/sleep_illustration.png'
import { IconBadge } from '@/components/ui/IconBadge'
import { dashboardEmptyStates } from '@/constants/dashboard-content'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function SleepCard({ hours, quality, status, onRetry }: StatefulWidgetProps & { hours?: number | null; quality?: number | null }) {
  const label = quality ? `${quality}/5 quality` : 'No sleep signal yet'
  const hoursLabel = typeof hours === 'number' ? formatSleepHours(hours) : '—'

  return (
    <DashboardCard title="Sleep" status={status} onRetry={onRetry} empty={{ ...dashboardEmptyStates.sleep, image: sleepIllustration }}>
      <div className="mt-5 flex items-center gap-4">
        <IconBadge icon={Moon} tone="violet" />
        <div>
          <p className="text-3xl font-bold text-forest">{hoursLabel}</p>
          <p className="text-sm text-ink/60">{label}</p>
        </div>
      </div>
      <span className="mt-5 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">Learning recovery rhythm</span>
    </DashboardCard>
  )
}

function formatSleepHours(hours: number) {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return minutes ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`
}
