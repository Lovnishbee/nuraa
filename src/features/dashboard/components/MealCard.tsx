import { Utensils } from 'lucide-react'
import healthyMealIllustration from '@/assets/dashboard/healthy_meals_illustration.png'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function MealCard({ status, onRetry }: StatefulWidgetProps) {
  return (
    <DashboardCard title="Meals" status={status} onRetry={onRetry} empty={{ title: 'Meal logging coming later', description: 'Phase 2 shows the card architecture without food recognition.', image: healthyMealIllustration }}>
      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-13 place-items-center rounded-3xl bg-sage text-nuraa"><Utensils size={24} /></span>
        <div>
          <p className="text-3xl font-bold text-forest">1,450</p>
          <p className="text-sm text-ink/60">of 1,900 setup calories</p>
        </div>
      </div>
      <div className="mt-5 h-2 rounded-full bg-sage"><div className="h-full w-[76%] rounded-full bg-nuraa" /></div>
      <p className="mt-4 text-sm leading-6 text-ink/62">Placeholder nutrition snapshot. No meal AI or calorie analysis is active.</p>
    </DashboardCard>
  )
}
