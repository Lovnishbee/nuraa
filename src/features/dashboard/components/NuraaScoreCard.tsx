import { ArrowUpRight } from 'lucide-react'
import { ScoreRing } from '@/components/ScoreRing'
import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function NuraaScoreCard({ score = 0, category = 'Setting up', reason, status, onRetry }: StatefulWidgetProps & { score?: number | null; category?: string | null; reason?: string | null }) {
  return (
    <DashboardCard title="Nuraa Score™" status={status} onRetry={onRetry} empty={{ title: 'Score setup is ready', description: 'Complete your first check-in to begin your readiness baseline.' }}>
      <div className="mt-5 flex items-center gap-5">
        <ScoreRing score={score ?? 0} className="w-36 shrink-0" />
        <div className="min-w-0">
          <p className="text-2xl font-bold text-forest">{category ?? 'Setting up'}</p>
          <p className="mt-2 text-sm leading-6 text-ink/62">{reason || 'Your score will become more useful as Nuraa learns from your daily check-ins.'}</p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl bg-sage/70 p-4">
        <p className="text-sm font-semibold text-forest">Phase 2 framework</p>
        <p className="mt-1 text-xs leading-5 text-ink/60">Readiness is a placeholder until AI and connected signals are introduced later.</p>
      </div>
      <Button variant="outline" size="sm" className="mt-5"><ArrowUpRight size={14} /> View score details</Button>
    </DashboardCard>
  )
}
