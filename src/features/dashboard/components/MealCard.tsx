import { Utensils } from 'lucide-react'
import healthyMealIllustration from '@/assets/dashboard/healthy_meals_illustration.png'
import { IconBadge } from '@/components/ui/IconBadge'
import { dashboardEmptyStates } from '@/constants/dashboard-content'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function MealCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard title="Meals" status={status} onRetry={onRetry} empty={{ ...dashboardEmptyStates.meals, image: healthyMealIllustration }}>
      <div className="mt-5 flex items-center gap-4">
        <IconBadge icon={Utensils} />
        <div>
          <p className="text-3xl font-bold text-forest">1,450</p>
          <p className="text-sm text-ink/60">profile-based nutrition target</p>
        </div>
      </div>
      <div className="mt-5 h-2 rounded-full bg-sage"><div className="h-full w-[76%] rounded-full bg-nuraa" /></div>
      <p className="mt-4 text-sm leading-6 text-ink/64">Meal insights unlock as you start sharing food and routine signals.</p>
    </DashboardCard>
  )
}
