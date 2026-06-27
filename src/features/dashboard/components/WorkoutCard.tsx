import { Dumbbell, Footprints } from 'lucide-react'
import movementIllustration from '@/assets/dashboard/movement_illustration.png'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function WorkoutCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard title="Movement" status={status} onRetry={onRetry} empty={{ title: 'Workout planning is coming later', description: 'For now, use this as a movement readiness placeholder.', image: movementIllustration }}>
      <div className="mt-5 grid grid-cols-[auto_1fr] gap-4">
        <span className="grid size-13 place-items-center rounded-3xl bg-sage text-nuraa"><Footprints size={24} /></span>
        <div>
          <p className="text-3xl font-bold text-forest">4,650</p>
          <p className="text-sm text-ink/60">of 7,000 setup steps</p>
        </div>
      </div>
      <div className="mt-5 h-2 rounded-full bg-sage"><div className="h-full w-[66%] rounded-full bg-nuraa" /></div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-forest/72"><Dumbbell size={16} /> Adaptive workouts are not active yet.</div>
    </DashboardCard>
  )
}
