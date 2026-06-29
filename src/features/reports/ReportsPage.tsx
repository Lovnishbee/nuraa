import { useQuery } from '@tanstack/react-query'
import { BarChart3, CalendarDays, FileText, Lightbulb, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DesktopHeader } from '@/components/app/DesktopHeader'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import reflectionIllustration from '@/assets/dashboard/reflection_illustration.png'
import { getInsightsSummary } from '@/services/intelligence'
import { getProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import { getTimeOfDayGreeting } from '@/utils/greeting'
import { getCurrentDate } from '@/lib/date'
import { DashboardCard } from '../dashboard/components/DashboardCard'
import { DashboardLayout } from '../dashboard/components/DashboardLayout'
import { SectionHeader } from '../dashboard/components/SectionHeader'
import type { WidgetStatus } from '../dashboard/components/types'

type FocusItem = { title: string; description: string; category?: string }

function statusFromQuery(isLoading: boolean, isError: boolean, hasData: boolean): WidgetStatus {
  if (isLoading) return 'loading'
  if (isError) return 'error'
  if (!hasData) return 'empty'
  return 'populated'
}

function parseFocusItems(value: unknown): FocusItem[] {
  return Array.isArray(value)
    ? value.filter((item): item is FocusItem => Boolean(item && typeof item === 'object' && 'title' in item && 'description' in item))
    : []
}

function factorLabel(key: string) {
  return key.replace('_score', '').replace(/^\w/, (letter) => letter.toUpperCase())
}

export function ReportsPage() {
  const user = useAuthStore((state) => state.user)!
  const profile = useQuery({ queryKey: ['profile', user.id], queryFn: () => getProfileBundle(user.id) })
  const reports = useQuery({ queryKey: ['insights-summary', user.id], queryFn: () => getInsightsSummary(user.id) })
  const name = profile.data?.profile.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  const greeting = getTimeOfDayGreeting(getCurrentDate(), profile.data?.profile.timezone)
  const brief = reports.data?.brief
  const score = reports.data?.score
  const insights = reports.data?.insights ?? []
  const focusItems = parseFocusItems(brief?.focus_items)
  const recommendationItems = focusItems.length
    ? focusItems
    : insights.length
      ? insights.slice(0, 3).map((insight) => ({ title: insight.title ?? 'Build your baseline', description: insight.recommendation ?? insight.description ?? 'Keep your daily basics steady.', category: insight.category ?? undefined }))
      : [{ title: 'Build your baseline', description: 'Complete a daily check-in to unlock your first deterministic recommendations.', category: 'baseline' }]
  const factors = reports.data?.factors
  const factorEntries = factors ? [
    ['sleep_score', factors.sleep_score],
    ['stress_score', factors.stress_score],
    ['recovery_score', factors.recovery_score],
    ['activity_score', factors.activity_score],
    ['nutrition_score', factors.nutrition_score],
    ['hydration_score', factors.hydration_score],
  ] as const : []
  const status = statusFromQuery(reports.isLoading, reports.isError, Boolean(brief || insights.length || score))

  return (
    <DashboardLayout>
      <MobileHeader userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />
      <DesktopHeader title={`Reports, ${name}.`} subtitle={`${greeting}. Deterministic insights from your Nuraa signals.`} userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />

      <div className="md:hidden">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Reports</p>
        <h1 className="display mt-2 text-4xl leading-none text-forest">Insights hub.</h1>
        <p className="mt-2 text-sm text-ink/60">Reports are generated from saved check-ins and rule-based signals.</p>
      </div>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <DashboardCard title="Weekly insight" status={status} onRetry={() => void reports.refetch()} className="bg-forest p-7 text-white" empty={{ title: 'Reports are still learning.', description: 'Complete a check-in to create your first deterministic insight.' }}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-white/70"><Sparkles size={16} /> Rule-based insight</div>
          <h2 className="display mt-4 text-[42px] leading-[1.02] sm:text-5xl">{brief?.headline ?? 'Your routine is taking shape.'}</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/82">{brief?.summary ?? 'Nuraa will summarise patterns as your saved check-ins grow.'}</p>
          <div className="mt-6 rounded-[24px] border border-white/15 bg-white/8 p-4">
            <p className="text-sm font-semibold text-white">{brief?.insight ?? 'Personalised reports unlock as Nuraa learns more about your routine.'}</p>
            <p className="mt-1 text-sm leading-6 text-white/68">No uploads, OCR, report analysis, AI calls, or medical diagnosis are used in Phase 3.</p>
          </div>
        </DashboardCard>

        <Card className="p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-sage text-nuraa"><BarChart3 size={22} /></span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[.12em] text-nuraa">Latest readiness</p>
              <h2 className="display mt-2 text-5xl leading-none text-forest">{score?.total_score ?? '—'}</h2>
              <p className="mt-2 text-sm font-semibold text-forest/72">{score?.readiness_category ?? 'No score yet'}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-ink/62">{score?.score_reason ?? 'Save a check-in to generate your first Nuraa Score.'}</p>
          <div className="mt-5 rounded-[24px] bg-sage p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-forest"><ShieldCheck size={17} className="text-nuraa" /> Confidence {score?.confidence ?? 0}%</p>
            <p className="mt-1 text-xs leading-5 text-ink/58">Strongest signal: {score?.primary_driver ?? '—'} · Limiting signal: {score?.limiting_factor ?? '—'}</p>
          </div>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="Latest recommendations" eyebrow="What to focus on now" action={<Button asChild variant="secondary" size="sm"><Link to="/app/check-in">Update check-in</Link></Button>} />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {recommendationItems.map((item) => (
            <Card key={`${item.title}-${item.category}`} className="p-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-sage text-nuraa"><Lightbulb size={20} /></span>
              <p className="mt-5 font-bold text-forest">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink/62">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-nuraa"><CalendarDays size={17} /> Patterns</p>
          <div className="mt-5 space-y-3">
            {insights.length ? insights.slice(0, 5).map((insight) => (
              <div key={insight.id} className="rounded-[22px] border border-forest/10 bg-canvas p-4">
                <p className="font-semibold text-forest">{insight.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink/62">{insight.description}</p>
              </div>
            )) : (
              <EmptyState title="No patterns yet" description="Check in for a few days so Nuraa can detect safe, deterministic patterns." image={reflectionIllustration} />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-nuraa"><FileText size={17} /> Score factors</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {factorEntries.length ? factorEntries.map(([key, value]) => (
              <div key={key} className="rounded-[22px] border border-forest/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-forest">{factorLabel(key)}</p>
                  <p className="text-lg font-bold text-nuraa">{value ?? '—'}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-sage">
                  <div className="h-full rounded-full bg-nuraa" style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }} />
                </div>
              </div>
            )) : (
              <EmptyState title="No score factors yet" description="Your first check-in will create sleep, stress, recovery, activity, nutrition, and hydration factors." />
            )}
          </div>
        </Card>
      </section>

      <Card className="mt-7 overflow-hidden bg-sage p-6">
        <p className="text-sm font-bold uppercase tracking-[.12em] text-nuraa">Future reports</p>
        <h2 className="display mt-3 text-3xl leading-tight text-forest">Personalised reports unlock as Nuraa learns more about your routine.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/64">Phase 3 only uses deterministic check-in intelligence. Health report uploads, AI analysis, OCR, body scans, and payments remain out of scope.</p>
      </Card>
    </DashboardLayout>
  )
}
