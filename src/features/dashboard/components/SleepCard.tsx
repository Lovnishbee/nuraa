import { Moon } from 'lucide-react'
import sleepIllustration from '@/assets/dashboard/sleep_illustration.png'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function SleepCard({ quality, status, onRetry }: StatefulWidgetProps & { quality?: number | null }) {
  const label = quality ? `${quality}/5 quality` : 'No sleep signal yet'

  return (
    <DashboardCard title="Sleep" status={status} onRetry={onRetry} empty={{ title: 'Sleep signal pending', description: 'Daily check-in sleep quality will appear here.', image: sleepIllustration }}>
      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-13 place-items-center rounded-3xl bg-violet-50 text-violet-600"><Moon size={24} /></span>
        <div>
          <p className="text-3xl font-bold text-forest">6h 45m</p>
          <p className="text-sm text-ink/60">{label}</p>
        </div>
      </div>
      <span className="mt-5 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">Needs consistency</span>
    </DashboardCard>
  )
}
