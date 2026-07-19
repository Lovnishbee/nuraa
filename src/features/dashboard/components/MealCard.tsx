import { Utensils } from 'lucide-react'
import { Link } from 'react-router-dom'
import healthyMealIllustration from '@/assets/dashboard/healthy_meals_illustration.png'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/IconBadge'
import { dashboardEmptyStates } from '@/constants/dashboard-content'
import type { MealLogSummary } from '../log-summary'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function MealCard({ summary, status, onRetry }: StatefulWidgetProps & { summary?: MealLogSummary }) {
  const calories = summary?.calories ?? 0
  const protein = summary?.proteinG ?? 0

  return (
    <DashboardCard
      title="Meals"
      status={status}
      onRetry={onRetry}
      empty={{ ...dashboardEmptyStates.meals, image: healthyMealIllustration }}
      emptyAction={<Button asChild variant="secondary" size="sm" className="w-full"><Link to="/app/meals">Log meal</Link></Button>}
    >
      <div className="mt-5 flex items-center gap-4">
        <IconBadge icon={Utensils} />
        <div>
          <p className="text-3xl font-bold text-forest">{calories || '—'}</p>
          <p className="text-sm text-ink/60">{summary?.mealsLogged ?? 0} meals logged today</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-sage/70 p-3">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">Calories</p>
          <p className="mt-1 font-bold text-forest">{calories ? `${calories} kcal` : 'Not added'}</p>
        </div>
        <div className="rounded-2xl bg-sage/70 p-3">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-ink/45">Protein</p>
          <p className="mt-1 font-bold text-forest">{protein ? `${protein}g` : 'Not added'}</p>
        </div>
      </div>
      <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
        <Link to="/app/meals">Log meal</Link>
      </Button>
    </DashboardCard>
  )
}
