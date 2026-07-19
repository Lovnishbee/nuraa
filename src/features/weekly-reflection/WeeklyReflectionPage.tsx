import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CalendarDays, CheckCircle2, MessageCircle, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DesktopHeader } from '@/components/app/DesktopHeader'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import reflectionIllustration from '@/assets/dashboard/reflection_illustration.png'
import { getCoachEligibility } from '@/services/coachService'
import { dismissWeeklyReflection, generateWeeklyReflection, getCurrentWeeklyReflection, markWeeklyReflectionViewed, startWeeklyReflectionCoach } from '@/services/weeklyReflectionService'
import { getProfileBundle } from '@/services/profile'
import { useAuthStore } from '@/stores/auth-store'
import type { WeeklyReflection, WeeklyReflectionPayload } from '@/types/database'

export function WeeklyReflectionPage() {
  const user = useAuthStore((state) => state.user)
  const userId = user?.id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const eligibility = useQuery({ queryKey: ['coach-eligibility', userId], queryFn: getCoachEligibility, enabled: Boolean(userId) })
  const profile = useQuery({ queryKey: ['profile', userId], queryFn: () => getProfileBundle(userId!), enabled: Boolean(userId) })
  const reflection = useQuery({ queryKey: ['weekly-reflection', userId], queryFn: getCurrentWeeklyReflection, enabled: Boolean(userId && eligibility.data?.coachEnabled) })

  const generate = useMutation({
    mutationFn: generateWeeklyReflection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weekly-reflection', userId] }),
  })
  const dismiss = useMutation({
    mutationFn: dismissWeeklyReflection,
    onSuccess: () => navigate('/app/reports'),
  })
  const askCoach = useMutation({
    mutationFn: (id: string) => startWeeklyReflectionCoach(id, eligibility.data?.responseDetail ?? 'balanced'),
    onSuccess: (response) => {
      const target = response.conversationId ? `/app/coach?conversation=${response.conversationId}` : '/app/coach'
      navigate(target)
    },
  })

  useEffect(() => {
    const current = reflection.data?.reflection
    if (!current || current.viewed_at) return
    void markWeeklyReflectionViewed(current.id).then(() => queryClient.invalidateQueries({ queryKey: ['weekly-reflection', userId] }))
  }, [queryClient, reflection.data?.reflection, userId])

  if (!userId) return <Navigate to="/login" replace />
  if (eligibility.isLoading) return <div className="p-6 sm:p-10"><LoadingSkeleton className="h-96" /></div>
  if (!eligibility.data?.coachEnabled) return <Navigate to="/app/dashboard" replace />

  const current = reflection.data?.reflection

  return (
    <div className="mx-auto max-w-[1180px] p-4 pb-28 sm:p-6 lg:p-8">
      <MobileHeader userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />
      <DesktopHeader title="Weekly reflection" subtitle="A calm review of your last seven local health days." userName={profile.data?.profile.full_name} avatarUrl={profile.data?.profile.avatar_url} />

      {reflection.isLoading ? (
        <LoadingSkeleton className="mt-7 h-[560px]" />
      ) : current ? (
        <WeeklyReflectionView
          reflection={current}
          isDismissing={dismiss.isPending}
          isOpeningCoach={askCoach.isPending}
          onDismiss={() => dismiss.mutate(current.id)}
          onAskCoach={() => askCoach.mutate(current.id)}
        />
      ) : (
        <Card className="mt-7 grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-nuraa"><Sparkles size={15} /> Private beta</p>
            <h1 className="display mt-3 text-4xl leading-none text-forest sm:text-5xl">Generate your weekly reflection.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink/64">Nuraa will summarise what changed, what supported you, and one realistic focus for next week using deterministic weekly signals.</p>
            {reflection.data?.status === 'disabled' ? (
              <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Weekly Reflection is not available for this beta user yet.</p>
            ) : null}
            {generate.isError ? (
              <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Weekly Reflection could not be generated right now. Please try again after a minute.
              </p>
            ) : null}
            <Button className="mt-6" onClick={() => generate.mutate()} disabled={generate.isPending}>
              {generate.isPending ? 'Generating…' : 'Generate weekly reflection'} <ArrowRight size={16} />
            </Button>
          </div>
          <EmptyState title="Private by design" description="No raw notes, medical reports, prompts, or provider internals are used in this reflection." image={reflectionIllustration} />
        </Card>
      )}
    </div>
  )
}

function WeeklyReflectionView({ reflection, isDismissing, isOpeningCoach, onDismiss, onAskCoach }: {
  reflection: WeeklyReflection
  isDismissing: boolean
  isOpeningCoach: boolean
  onDismiss: () => void
  onAskCoach: () => void
}) {
  const payload = reflection.summary_payload
  return (
    <main className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-5">
        <Card className="bg-forest p-6 text-white sm:p-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/70"><CalendarDays size={15} /> {formatDate(reflection.week_start_date)} – {formatDate(reflection.week_end_date)}</p>
          <h1 className="display mt-4 text-4xl leading-none sm:text-5xl">{payload.headline}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">{payload.weekAtGlance.summary}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Average score" value={payload.weekAtGlance.averageScore ?? '—'} />
            <Metric label="Direction" value={directionLabel(payload.weekAtGlance.scoreDirection)} />
            <Metric label="Confidence" value={payload.weekAtGlance.confidence} />
          </div>
        </Card>

        <ReflectionSection title="What changed" items={payload.whatChanged} />
        <ReflectionSection title="What supported you" items={payload.whatSupportedYou} />
        <ReflectionSection title="What to pay attention to" items={payload.attentionAreas} />
      </section>

      <aside className="space-y-5">
        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-nuraa"><CheckCircle2 size={16} /> One focus for next week</p>
          <h2 className="mt-4 text-2xl font-bold leading-tight text-forest">{payload.nextWeekFocus.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/64">{payload.nextWeekFocus.detail}</p>
          {payload.confidenceNote ? <p className="mt-5 rounded-2xl bg-sage p-4 text-sm leading-6 text-forest/72">{payload.confidenceNote}</p> : null}
        </Card>

        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-nuraa"><MessageCircle size={16} /> Ask Nuraa about this week</p>
          <div className="mt-4 space-y-2">
            {payload.suggestedCoachPrompts.map((prompt) => <p key={prompt} className="rounded-2xl bg-sage px-4 py-3 text-sm text-forest/75">{prompt}</p>)}
          </div>
          <Button className="mt-5 w-full" onClick={onAskCoach} disabled={isOpeningCoach}>
            {isOpeningCoach ? 'Opening Coach…' : 'Ask Nuraa'} <ArrowRight size={16} />
          </Button>
        </Card>

        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.12em] text-nuraa"><ShieldCheck size={16} /> Source-safe summary</p>
          <p className="mt-3 text-sm leading-6 text-ink/62">This reflection uses deterministic weekly signals only. Raw notes, medical reports, prompts, model names, and internal context are not shown.</p>
          <Button className="mt-5 w-full" variant="outline" onClick={onDismiss} disabled={isDismissing}><X size={16} /> Dismiss reflection</Button>
        </Card>
      </aside>
    </main>
  )
}

function ReflectionSection({ title, items }: { title: string; items: WeeklyReflectionPayload['whatChanged'] }) {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-forest">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length ? items.map((item) => (
          <div key={`${item.title}-${item.sourceReference}`} className="rounded-[22px] border border-forest/10 bg-canvas p-4">
            <p className="font-semibold text-forest">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-ink/64">{item.explanation}</p>
          </div>
        )) : <p className="text-sm leading-6 text-ink/58">Nuraa needs more weekly signal before this section becomes specific.</p>}
      </div>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
      <p className="text-xs uppercase tracking-[.12em] text-white/55">{label}</p>
      <p className="mt-1 text-2xl font-bold capitalize text-white">{value}</p>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`))
}

function directionLabel(value: WeeklyReflectionPayload['weekAtGlance']['scoreDirection']) {
  if (value === 'insufficient_data') return 'Building'
  return value
}
