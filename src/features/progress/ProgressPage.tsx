import { useQuery } from '@tanstack/react-query'
import { Battery, HeartPulse, LineChart, Moon, ShieldCheck, Waves } from 'lucide-react'
import { useState } from 'react'
import { DesktopHeader } from '@/components/app/DesktopHeader'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getProfileBundle } from '@/services/profile'
import { getProgressSummary, type ProgressRange } from '@/services/intelligence'
import { useAuthStore } from '@/stores/auth-store'
import { getTimeOfDayGreeting } from '@/utils/greeting'
import { getCurrentDate } from '@/lib/date'
import { DashboardCard } from '../dashboard/components/DashboardCard'
import { DashboardLayout } from '../dashboard/components/DashboardLayout'
import { MetricTile } from '../dashboard/components/MetricTile'
import { SectionHeader } from '../dashboard/components/SectionHeader'
import type { WidgetStatus } from '../dashboard/components/types'

type SeriesPoint = { date: string; value: number }

function statusFromQuery(isLoading: boolean, isError: boolean, hasData: boolean): WidgetStatus {
  if (isLoading) return 'loading'
  if (isError) return 'error'
  if (!hasData) return 'empty'
  return 'populated'
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function LineTrend({ points, label }: { points: SeriesPoint[]; label: string }) {
  const values = points.map((point) => point.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 100)
  const range = Math.max(max - min, 1)
  const polyline = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100
    const y = 92 - ((point.value - min) / range) * 76
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 100 100" className="h-56 w-full overflow-visible" role="img" aria-label={label}>
      <path d="M0 92H100" stroke="#16342F" strokeOpacity=".08" />
      <path d="M0 54H100" stroke="#16342F" strokeOpacity=".08" />
      <path d="M0 16H100" stroke="#16342F" strokeOpacity=".08" />
      <polyline points={polyline} fill="none" stroke="#0E766E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => {
        const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100
        const y = 92 - ((point.value - min) / range) * 76
        return <circle key={`${point.date}-${point.value}`} cx={x} cy={y} r="3.2" fill="#FAF9F7" stroke="#0E766E" strokeWidth="2" />
      })}
    </svg>
  )
}

export function ProgressPage() {
  const user = useAuthStore((state) => state.user)!
  const [range, setRange] = useState<ProgressRange>('7d')
  const profile = useQuery({ queryKey: ['profile', user.id], queryFn: () => getProfileBundle(user.id) })
  const progress = useQuery({ queryKey: ['progress-summary', user.id, range], queryFn: () => getProgressSummary(user.id, range) })
  const name = profile.data?.profile.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  const greeting = getTimeOfDayGreeting(getCurrentDate(), profile.data?.profile.timezone)
  const scorePoints = progress.data?.scores.map((score) => ({ date: score.score_date, value: score.total_score ?? 70 })) ?? []
  const sleepPoints = progress.data?.signals.map((signal) => ({ date: signal.signal_date, value: signal.sleep_score ?? 70 })) ?? []
  const stressPoints = progress.data?.signals.map((signal) => ({ date: signal.signal_date, value: signal.stress_score ?? 70 })) ?? []
  const energyPoints = progress.data?.signals.map((signal) => ({ date: signal.signal_date, value: signal.energy_level ? signal.energy_level * 20 : 70 })) ?? []
  const recoveryPoints = progress.data?.signals.map((signal) => ({ date: signal.signal_date, value: signal.recovery_score ?? 70 })) ?? []
  const status = statusFromQuery(progress.isLoading, progress.isError, scorePoints.length > 0)

  return (
    <DashboardLayout>
      <MobileHeader userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />
      <DesktopHeader title={`Progress, ${name}.`} subtitle={`${greeting}. Your trends are built from saved check-ins and deterministic signals.`} userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />

      <div className="md:hidden">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Progress</p>
        <h1 className="display mt-2 text-4xl leading-none text-forest">Your signal trends.</h1>
        <p className="mt-2 text-sm text-ink/60">Built from check-ins. No AI calls, uploads, or wearable data.</p>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <SectionHeader title="Readiness trend" eyebrow="Deterministic progress" />
        <div className="rounded-2xl border border-forest/10 bg-white p-1 shadow-sm">
          {(['7d', '30d'] as const).map((option) => (
            <Button key={option} variant="ghost" size="sm" onClick={() => setRange(option)} className={cn(range === option && 'bg-sage text-forest')}>
              {option === '7d' ? '7 days' : '30 days'}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.8fr]">
        <DashboardCard title="Nuraa Score trend" status={status} onRetry={() => void progress.refetch()} className="p-6" empty={{ title: 'Progress starts after your first check-in.', description: 'Save a daily check-in to generate your first readiness signal and trend line.' }}>
          <LineTrend points={scorePoints} label="Nuraa Score over time" />
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink/62">
            <span>Average score: <strong className="text-forest">{average(scorePoints.map((point) => point.value))}</strong></span>
            <span>Data points: <strong className="text-forest">{scorePoints.length}</strong></span>
            <span>Range: <strong className="text-forest">{range === '7d' ? '7 days' : '30 days'}</strong></span>
          </div>
        </DashboardCard>

        <Card className="p-6">
          <p className="text-sm font-bold uppercase tracking-[.12em] text-nuraa">Consistency</p>
          <h2 className="display mt-3 text-4xl leading-none text-forest">{scorePoints.length}/{range === '7d' ? 7 : 30}</h2>
          <p className="mt-3 text-sm leading-6 text-ink/62">Check-ins recorded in this range. More check-ins make patterns easier to interpret.</p>
          <div className="mt-5 rounded-[24px] bg-sage p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-forest"><ShieldCheck size={17} className="text-nuraa" /> Private deterministic signals</p>
            <p className="mt-1 text-xs leading-5 text-ink/58">Progress uses your own saved Nuraa rows under RLS.</p>
          </div>
        </Card>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile icon={LineChart} label="Score average" value={`${average(scorePoints.map((point) => point.value)) || '—'}`} detail="Weighted readiness" />
        <MetricTile icon={Moon} label="Sleep average" value={`${average(sleepPoints.map((point) => point.value)) || '—'}`} detail="Sleep signal score" tone="violet" />
        <MetricTile icon={Waves} label="Stress average" value={`${average(stressPoints.map((point) => point.value)) || '—'}`} detail="Higher is calmer" tone="amber" />
        <MetricTile icon={Battery} label="Energy average" value={`${average(energyPoints.map((point) => point.value)) || '—'}`} detail="Scaled from 1–5" tone="blue" />
        <MetricTile icon={HeartPulse} label="Recovery average" value={`${average(recoveryPoints.map((point) => point.value)) || '—'}`} detail="Energy, soreness, motivation" />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <DashboardCard title="Sleep pattern" status={status} onRetry={() => void progress.refetch()} empty={{ title: 'Sleep trend is empty.', description: 'Sleep quality and hours appear after check-ins.' }}>
          <LineTrend points={sleepPoints} label="Sleep score trend" />
        </DashboardCard>
        <DashboardCard title="Stress and recovery" status={status} onRetry={() => void progress.refetch()} empty={{ title: 'Recovery trend is empty.', description: 'Stress, soreness, energy, and motivation appear after check-ins.' }}>
          <LineTrend points={recoveryPoints.length ? recoveryPoints : stressPoints} label="Recovery score trend" />
        </DashboardCard>
      </section>
    </DashboardLayout>
  )
}
