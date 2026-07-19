import { useQuery } from '@tanstack/react-query'
import { Battery, HeartPulse, Moon, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DesktopHeader } from '@/components/app/DesktopHeader'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { getCoachEligibility } from '@/services/coachService'
import { getDashboardSummary } from '@/services/intelligence'
import { getMealLogs } from '@/services/mealService'
import { getProfileBundle } from '@/services/profile'
import { getProactiveCards } from '@/services/proactiveCards'
import { getWorkoutLogs } from '@/services/workoutService'
import { useAuthStore } from '@/stores/auth-store'
import { getTimeOfDayGreeting } from '@/utils/greeting'
import { getCurrentDate, getTodayInTimezone } from '@/lib/date'
import type { HealthSignal } from '@/features/intelligence/types'
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
import { summarizeMealsForDate, summarizeWorkoutsForDate } from './log-summary'
import { ProactiveGuidanceSection } from '@/features/proactive/components/ProactiveGuidanceSection'

function queryStatus(isLoading: boolean, isError: boolean, hasData = true): WidgetStatus {
  if (isLoading) return 'loading'
  if (isError) return 'error'
  if (!hasData) return 'empty'
  return 'populated'
}

type FocusItem = { title: string; description: string; category?: string }

function parseFocusItems(value: unknown): FocusItem[] {
  return Array.isArray(value)
    ? value.filter((item): item is FocusItem => Boolean(item && typeof item === 'object' && 'title' in item && 'description' in item))
    : []
}

function readHydrationLitres(value: unknown): number | null {
  if (!value || typeof value !== 'object' || !('hydration' in value)) return null
  const hydration = (value as Partial<HealthSignal>).hydration
  return typeof hydration?.litres === 'number' ? hydration.litres : null
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)!
  const profile = useQuery({ queryKey: ['profile', user.id], queryFn: () => getProfileBundle(user.id) })
  const dashboard = useQuery({ queryKey: ['dashboard-intelligence', user.id], queryFn: () => getDashboardSummary(user.id) })
  const meals = useQuery({ queryKey: ['meal-logs', user.id], queryFn: () => getMealLogs(user.id) })
  const workouts = useQuery({ queryKey: ['workout-logs', user.id], queryFn: () => getWorkoutLogs(user.id) })
  const coachEligibility = useQuery({ queryKey: ['coach-eligibility', user.id], queryFn: getCoachEligibility })
  const name = profile.data?.profile.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  const greeting = getTimeOfDayGreeting(getCurrentDate(), profile.data?.profile.timezone)
  const today = getTodayInTimezone(profile.data?.profile.timezone)
  const score = dashboard.data?.score
  const signal = dashboard.data?.signal
  const hydrationLitres = readHydrationLitres(signal?.raw_signal_json)
  const brief = dashboard.data?.brief
  const focusItems = parseFocusItems(brief?.focus_items)
  const scoreStatus = queryStatus(dashboard.isLoading, dashboard.isError, Boolean(score))
  const signalStatus = queryStatus(dashboard.isLoading, dashboard.isError, Boolean(signal))
  const mealSummary = summarizeMealsForDate(meals.data ?? [], today)
  const workoutSummary = summarizeWorkoutsForDate(workouts.data ?? [], today)
  const mealStatus = queryStatus(meals.isLoading, meals.isError, mealSummary.mealsLogged > 0)
  const workoutStatus = queryStatus(workouts.isLoading, workouts.isError, workoutSummary.sessions > 0)
  const trendValues = dashboard.data?.scoreHistory.map((item) => item.total_score ?? 70) ?? []
  const showCoachActions = Boolean(coachEligibility.data?.coachEnabled)
  const proactiveCards = useQuery({
    queryKey: ['proactive-cards', user.id],
    queryFn: getProactiveCards,
    enabled: showCoachActions,
    retry: false,
    staleTime: 10 * 60_000,
  })
  const proactiveEnabled = showCoachActions && proactiveCards.data?.status !== 'disabled'

  return (
    <DashboardLayout>
      <MobileHeader userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />
      <DesktopHeader title={`${greeting}, ${name}.`} subtitle="Here is what matters for your body today." userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />

      <div className="md:hidden">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Your daily view</p>
        <h1 className="display mt-2 text-4xl leading-none text-forest">{greeting}, {name}.</h1>
        <p className="mt-2 text-sm text-ink/60">Here is what matters for your body today.</p>
      </div>

      <div className="mt-7 grid gap-6">
        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.38fr]">
          <NuraaScoreCard
            score={score?.total_score}
            category={score?.readiness_category}
            reason={score?.score_reason}
            note={score?.recommended_focus}
            confidence={score?.confidence}
            primaryDriver={score?.primary_driver}
            limitingFactor={score?.limiting_factor}
            hasBaseline={Boolean(score)}
            coachActionHref={showCoachActions ? '/app/coach?action=explain_score' : undefined}
            status={scoreStatus}
            onRetry={() => void dashboard.refetch()}
          />
          <DailyBriefCard brief={brief} coachActionHref={showCoachActions ? '/app/coach?action=ask_today' : undefined} status={queryStatus(dashboard.isLoading, dashboard.isError, Boolean(brief))} onRetry={() => void dashboard.refetch()} />
        </section>

        <section>
          <TodaysPrioritiesCard items={focusItems} status={queryStatus(dashboard.isLoading, dashboard.isError, focusItems.length > 0)} onRetry={() => void dashboard.refetch()} />
        </section>

        <ProactiveGuidanceSection
          cards={proactiveCards.data?.cards ?? []}
          enabled={proactiveEnabled}
          coachEnabled={showCoachActions}
          isLoading={proactiveCards.isLoading || proactiveCards.isPending}
          isError={proactiveCards.isError}
          onRetry={() => void proactiveCards.refetch()}
        />

        <section>
          <SectionHeader title="Signals" eyebrow="Today’s body read" action={<Button asChild variant="secondary" size="sm"><Link to="/app/check-in">Daily check-in</Link></Button>} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Moon} label="Sleep signal" value={signal?.sleep_score ? `${signal.sleep_score}/100` : '—'} detail={signal?.sleep_hours ? `${signal.sleep_hours}h logged` : 'From latest check-in'} tone="violet" />
            <MetricTile icon={Waves} label="Stress signal" value={signal?.stress_score ? `${signal.stress_score}/100` : '—'} detail={signal?.stress_level ? `${signal.stress_level}/5 stress level` : 'From latest check-in'} tone="amber" />
            <MetricTile icon={HeartPulse} label="Recovery" value={signal?.recovery_score ? `${signal.recovery_score}/100` : '—'} detail={signal?.soreness_level ? `${signal.soreness_level}/5 soreness` : 'Energy and soreness blend'} />
            <MetricTile icon={Battery} label="Energy" value={signal?.energy_level ? `${signal.energy_level}/5` : '—'} detail="From latest check-in" tone="blue" />
          </div>
        </section>

        <section>
          <SectionHeader title="Your day at a glance" eyebrow={score ? score.score_date : 'Complete a check-in to start'} />
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <MealCard summary={mealSummary} status={mealStatus} onRetry={() => void meals.refetch()} />
            <WorkoutCard summary={workoutSummary} status={workoutStatus} onRetry={() => void workouts.refetch()} />
            <HydrationCard litres={hydrationLitres} score={signal?.hydration_score} status={signalStatus} />
            <SleepCard hours={signal?.sleep_hours} quality={signal?.sleep_quality} status={signalStatus} />
            <ProgressCard values={trendValues} status={queryStatus(dashboard.isLoading, dashboard.isError, trendValues.length > 0)} />
            <WeeklyReportCard checkins={dashboard.data?.scoreHistory.length ?? 0} status={queryStatus(dashboard.isLoading, dashboard.isError, Boolean(score))} />
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
