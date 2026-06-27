import { useQuery } from '@tanstack/react-query'
import { Activity, HeartPulse, Moon, Salad, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DesktopHeader } from '@/components/app/DesktopHeader'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { dashboardPlaceholderMetrics } from '@/constants/dashboard-placeholders'
import { getDashboardSummary } from '@/services/dashboard'
import { getProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import { getTimeOfDayGreeting } from '@/utils/greeting'
import { DailyBriefCard } from './components/DailyBriefCard'
import { DashboardGrid, DashboardLayout } from './components/DashboardLayout'
import { HydrationCard } from './components/HydrationCard'
import { InsightCard } from './components/InsightCard'
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

  return (
    <DashboardLayout>
      <MobileHeader userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />
      <DesktopHeader title={`${greeting}, ${name}.`} subtitle="Here’s your calm health overview for today." userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />

      <div className="md:hidden">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Your daily view</p>
        <h1 className="display mt-2 text-4xl leading-none text-forest">{greeting}, {name}.</h1>
        <p className="mt-2 text-sm text-ink/60">Here’s your calm health overview for today.</p>
      </div>

      <DashboardGrid>
        <section className="grid gap-5 lg:col-span-4">
          <NuraaScoreCard score={score?.total_score ?? 0} category={score?.readiness_category ?? 'Setting up'} reason={score?.score_reason} status={status} onRetry={() => void dashboard.refetch()} />
          <InsightCard icon={HeartPulse} title="Setup insight" description="Your dashboard is connected to Supabase and ready to become more adaptive as you add daily check-ins." status={status} />
        </section>

        <section className="grid gap-5 lg:col-span-8">
          <DailyBriefCard status={status} onRetry={() => void dashboard.refetch()} />
          <TodaysPrioritiesCard status={status} onRetry={() => void dashboard.refetch()} />
        </section>

        <section className="lg:col-span-12">
          <SectionHeader title="Today’s foundation" eyebrow="Signals" action={<Button asChild variant="secondary" size="sm"><Link to="/app/check-in">Start check-in</Link></Button>} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Salad} label="Calories" value={`${dashboardPlaceholderMetrics.calories.current.toLocaleString()}`} detail={`${dashboardPlaceholderMetrics.calories.percent}% setup target`} />
            <MetricTile icon={Activity} label="Steps" value={dashboardPlaceholderMetrics.steps.current.toLocaleString()} detail={`${dashboardPlaceholderMetrics.steps.percent}% setup target`} />
            <MetricTile icon={Waves} label="Stress" value={latestCheckin?.stress_level ? `${latestCheckin.stress_level}/5` : '—'} detail="From latest check-in" tone="amber" />
            <MetricTile icon={Moon} label="Sleep" value={latestCheckin?.sleep_quality ? `${latestCheckin.sleep_quality}/5` : '—'} detail="From latest check-in" tone="violet" />
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 lg:col-span-8">
          <MealCard status={status} />
          <WorkoutCard status={status} />
          <HydrationCard status={status} />
          <SleepCard quality={latestCheckin?.sleep_quality} status={queryStatus(dashboard.isLoading, dashboard.isError, Boolean(latestCheckin))} />
        </section>

        <section className="grid gap-5 lg:col-span-4">
          <ProgressCard values={[...dashboardPlaceholderMetrics.progress]} status={status} />
          <WeeklyReportCard checkins={weeklyCheckins.length} status={status} />
        </section>
      </DashboardGrid>
    </DashboardLayout>
  )
}
