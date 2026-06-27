import { useQuery } from '@tanstack/react-query'
import { Activity, Moon, Salad, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DesktopHeader } from '@/components/app/DesktopHeader'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { dashboardMetrics } from '@/constants/dashboard-content'
import { getDashboardSummary } from '@/services/dashboard'
import { getProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import { getTimeOfDayGreeting } from '@/utils/greeting'
import { DailyBriefCard } from './components/DailyBriefCard'
import { DashboardLayout } from './components/DashboardLayout'
import { HydrationCard } from './components/HydrationCard'
import { MealCard } from './components/MealCard'
import { MetricTile } from './components/MetricTile'
import { NuraaScoreCard } from './components/NuraaScoreCard'
import { ProgressCard } from './components/ProgressCard'
import { SectionHeader } from './components/SectionHeader'
import { SleepCard } from './components/SleepCard'
import { TodaysPrioritiesCard } from './components/TodaysPrioritiesCard'
import type { WidgetStatus } from './components/types'
import { WeeklyReportCard } from './components/WeeklyReportCard'
import { WorkoutCard } from './components/WorkoutCard'
import { getDashboardReadiness } from './readiness'

function queryStatus(isLoading: boolean, isError: boolean, hasData = true): WidgetStatus {
  if (isLoading) return 'loading'
  if (isError) return 'error'
  if (!hasData) return 'empty'
  return 'populated'
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)!
  const profile = useQuery({ queryKey: ['profile', user.id], queryFn: () => getProfileBundle(user.id) })
  const dashboard = useQuery({ queryKey: ['dashboard-summary', user.id], queryFn: () => getDashboardSummary(user.id) })
  const name = profile.data?.profile.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  const greeting = getTimeOfDayGreeting(new Date(), profile.data?.profile.timezone)
  const status = queryStatus(dashboard.isLoading, dashboard.isError)
  const score = dashboard.data?.score
  const latestCheckin = dashboard.data?.latestCheckin
  const weeklyCheckins = dashboard.data?.weeklyCheckins ?? []
  const readiness = getDashboardReadiness(score, latestCheckin, weeklyCheckins.length)

  return (
    <DashboardLayout>
      <MobileHeader userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />
      <DesktopHeader title={`${greeting}, ${name}.`} subtitle="Your health foundation is taking shape." userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />

      <div className="md:hidden">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Your daily view</p>
        <h1 className="display mt-2 text-4xl leading-none text-forest">{greeting}, {name}.</h1>
        <p className="mt-2 text-sm text-ink/60">Your health foundation is taking shape.</p>
      </div>

      <div className="mt-7 grid gap-6">
        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.38fr]">
          <NuraaScoreCard score={readiness.score} category={readiness.category} reason={readiness.reason} note={readiness.note} hasBaseline={readiness.hasBaseline} status={status} onRetry={() => void dashboard.refetch()} />
          <DailyBriefCard status={status} onRetry={() => void dashboard.refetch()} />
        </section>

        <section>
          <TodaysPrioritiesCard status={status} onRetry={() => void dashboard.refetch()} />
        </section>

        <section>
          <SectionHeader title="Signals" eyebrow="Learning your routine" action={<Button asChild variant="secondary" size="sm"><Link to="/app/check-in">Daily check-in</Link></Button>} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Salad} label="Calories" value={`${dashboardMetrics.calories.current.toLocaleString()}`} detail="Nutrition target from your profile" />
            <MetricTile icon={Activity} label="Steps" value={dashboardMetrics.steps.current.toLocaleString()} detail="Movement rhythm forming" />
            <MetricTile icon={Waves} label="Stress" value={latestCheckin?.stress_level ? `${latestCheckin.stress_level}/5` : '—'} detail="From latest check-in" tone="amber" />
            <MetricTile icon={Moon} label="Sleep" value={latestCheckin?.sleep_quality ? `${latestCheckin.sleep_quality}/5` : '—'} detail="From latest check-in" tone="violet" />
          </div>
        </section>

        <section>
          <SectionHeader title="Your day at a glance" eyebrow={readiness.checkinCountLabel} />
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <MealCard status={status} />
            <WorkoutCard status={status} />
            <HydrationCard status={status} />
          <SleepCard quality={latestCheckin?.sleep_quality} status={queryStatus(dashboard.isLoading, dashboard.isError, Boolean(latestCheckin))} />
            <ProgressCard values={[...dashboardMetrics.progress]} status={status} />
            <WeeklyReportCard checkins={weeklyCheckins.length} status={status} />
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
