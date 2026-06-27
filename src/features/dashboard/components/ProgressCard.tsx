import { TrendingUp } from 'lucide-react'
import { IconBadge } from '@/components/ui/IconBadge'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function ProgressCard({ values = [72, 68, 71, 74, 78, 78, 80], status, onRetry }: StatefulWidgetProps & { values?: number[] }) {
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - value}`).join(' ')

  return (
    <DashboardCard title="Progress" status={status} onRetry={onRetry} empty={{ title: 'Progress starts soon', description: 'Complete check-ins across the week to fill this chart.' }}>
      <div className="mt-5 flex items-center gap-3">
        <IconBadge icon={TrendingUp} />
        <div>
          <p className="font-semibold text-forest">Weekly readiness trend</p>
          <p className="text-sm text-ink/58">Your health foundation is taking shape.</p>
        </div>
      </div>
      <svg viewBox="0 0 100 42" className="mt-7 h-28 w-full overflow-visible" role="img" aria-label="Weekly progress chart">
        <polyline points={points} fill="none" stroke="#0E766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((value, index) => <circle key={`${value}-${index}`} cx={(index / Math.max(values.length - 1, 1)) * 100} cy={100 - value} r="2.3" fill="#FAF9F7" stroke="#0E766E" strokeWidth="1.8" />)}
      </svg>
    </DashboardCard>
  )
}
