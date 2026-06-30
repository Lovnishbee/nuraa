import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ScoreRing } from '@/components/ScoreRing'
import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'
import type { StatefulWidgetProps } from './types'

export function NuraaScoreCard({ score = 0, category = 'Setting up your readiness baseline', reason, note, confidence, primaryDriver, limitingFactor, hasBaseline = false, coachActionHref, status, onRetry }: StatefulWidgetProps & { score?: number | null; category?: string | null; reason?: string | null; note?: string | null; confidence?: number | null; primaryDriver?: string | null; limitingFactor?: string | null; hasBaseline?: boolean; coachActionHref?: string }) {
  return (
    <DashboardCard title="Nuraa Score™" status={status} onRetry={onRetry} className="p-6" empty={{ title: 'Your readiness baseline is starting soon.', description: 'Complete your first check-in to begin tracking your daily health signals.' }}>
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <ScoreRing score={score ?? 0} className="mx-auto w-44 shrink-0 sm:mx-0" />
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight text-forest">{category ?? 'Setting up your readiness baseline'}</p>
          <p className="mt-3 text-sm leading-6 text-ink/68">{reason || 'Complete your first daily check-in to begin building your Nuraa Score.'}</p>
        </div>
      </div>
      <div className="mt-6 rounded-[22px] border border-nuraa/12 bg-sage/70 p-4">
        <p className="text-sm font-semibold text-forest">{hasBaseline ? 'Building your baseline' : 'Ready after your first check-in'}</p>
        <p className="mt-1 text-xs leading-5 text-ink/64">{note || 'Your score gets smarter as you log sleep, mood, meals, and movement.'}</p>
        {hasBaseline && (
          <div className="mt-4 grid gap-2 text-xs font-semibold text-forest/72 sm:grid-cols-3">
            <span>Confidence: {confidence ?? 0}%</span>
            <span>Strongest: {primaryDriver ?? '—'}</span>
            <span>Needs care: {limitingFactor ?? '—'}</span>
          </div>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant={hasBaseline ? 'outline' : 'primary'} size="sm">
          <Link to={hasBaseline ? '/app/progress' : '/app/check-in'}><ArrowUpRight size={14} /> {hasBaseline ? 'View progress' : 'Start check-in'}</Link>
        </Button>
        {coachActionHref && hasBaseline && (
          <Button asChild variant="secondary" size="sm">
            <Link to={coachActionHref}>Explain my score</Link>
          </Button>
        )}
      </div>
    </DashboardCard>
  )
}
