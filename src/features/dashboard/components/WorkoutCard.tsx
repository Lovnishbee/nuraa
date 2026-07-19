import { Dumbbell, Footprints } from 'lucide-react'
import { Link } from 'react-router-dom'
import movementIllustration from '@/assets/dashboard/movement_illustration.png'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/IconBadge'
import { dashboardEmptyStates } from '@/constants/dashboard-content'
import type { WorkoutLogSummary } from '../log-summary'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function WorkoutCard({ summary, status, onRetry }: StatefulWidgetProps & { summary?: WorkoutLogSummary }) {
  const sessions = summary?.sessions ?? 0
  const minutes = summary?.minutes ?? 0

  return (
    <DashboardCard
      title="Movement"
      status={status}
      onRetry={onRetry}
      empty={{ ...dashboardEmptyStates.movement, image: movementIllustration }}
      emptyAction={<Button asChild variant="secondary" size="sm" className="w-full"><Link to="/app/workout">Log workout</Link></Button>}
    >
      <div className="mt-5 grid grid-cols-[auto_1fr] gap-4">
        <IconBadge icon={Footprints} />
        <div>
          <p className="text-3xl font-bold text-forest">{minutes || '—'}</p>
          <p className="text-sm text-ink/60">{sessions} sessions logged today</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-sage/70 p-3">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">Minutes</p>
          <p className="mt-1 font-bold text-forest">{minutes ? `${minutes} min` : 'Not added'}</p>
        </div>
        <div className="rounded-2xl bg-sage/70 p-3">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">Calories</p>
          <p className="mt-1 font-bold text-forest">{summary?.caloriesBurned ? `${summary.caloriesBurned} kcal` : 'Optional'}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-forest/72"><Dumbbell size={16} strokeWidth={1.9} /> Manual movement logs only.</div>
      <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
        <Link to="/app/workout">Log workout</Link>
      </Button>
    </DashboardCard>
  )
}
