import { useMutation, useQuery } from '@tanstack/react-query'
import { Activity, CreditCard, Eye, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { getAIInternalAccessStatus } from '@/services/aiGateway'
import { getProactiveCards } from '@/services/proactiveCards'
import { invokeProactiveEngine } from '@/services/proactiveIntelligenceService'
import type { InsightCandidate, ProactiveCard } from '../types'

export function ProactiveIntelligenceDevPage() {
  const access = useQuery({
    queryKey: ['ai-internal-access'],
    queryFn: getAIInternalAccessStatus,
    retry: false,
    staleTime: 30_000,
  })
  const summary = useQuery({
    queryKey: ['proactive-dev-summary'],
    queryFn: () => invokeProactiveEngine({ action: 'get_summary' }),
    enabled: Boolean(access.data?.enabled && access.data.consentGranted),
    retry: false,
  })
  const generate = useMutation({
    mutationFn: () => invokeProactiveEngine({ action: 'generate_candidates' }),
    onSuccess: () => void summary.refetch(),
  })
  const cards = useQuery({
    queryKey: ['proactive-dev-cards'],
    queryFn: getProactiveCards,
    enabled: Boolean(access.data?.enabled && access.data.consentGranted),
    retry: false,
  })

  if (access.isLoading || access.isPending) {
    return <div className="grid min-h-[60vh] place-items-center bg-canvas"><p className="text-sm font-semibold text-forest/60">Checking internal access…</p></div>
  }

  if (access.isError || !access.data.enabled || !access.data.consentGranted) {
    return <Navigate to="/app/dashboard" replace />
  }

  const latest = generate.data ?? summary.data
  const disabledReason = latest?.status === 'disabled' ? latest.reason : null
  const candidates = latest?.candidates ?? []
  const approved = candidates.filter((candidate) => candidate.status === 'approved')
  const suppressed = candidates.filter((candidate) => candidate.status === 'suppressed')

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-5 sm:px-7 lg:px-10 lg:py-8">
      <MobileHeader />
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Internal dev</p>
          <h1 className="display mt-2 text-4xl leading-none text-forest">Proactive intelligence review.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Reviews deterministic Phase V-A insight candidates only. No dashboard cards, AI copy, weekly reflections, or Coach continuations are created here.</p>
        </div>
        <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
          {generate.isPending ? 'Generating…' : 'Generate candidates'}
        </Button>
      </div>

      {disabledReason && (
        <Card className="mb-5 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Phase V-A runtime disabled: {disabledReason}</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Sparkles size={18} />} label="Generated" value={String(latest?.generated ?? candidates.length)} />
        <Metric icon={<ShieldCheck size={18} />} label="Would approve" value={String(latest?.approved ?? approved.length)} />
        <Metric icon={<Eye size={18} />} label="Suppressed" value={String(latest?.suppressed ?? suppressed.length)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-sage text-nuraa"><Activity size={20} /></span>
            <div>
              <p className="font-bold text-forest">Candidate review</p>
              <p className="text-sm text-ink/58">Safe deterministic outputs only.</p>
            </div>
          </div>

          {summary.isLoading && <p className="mt-5 text-sm text-ink/60">Loading candidates…</p>}
          {summary.isError && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Unable to load proactive candidates.</p>}
          {generate.isError && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{generate.error instanceof Error ? generate.error.message : 'Unable to generate candidates.'}</p>}
          {!summary.isLoading && candidates.length === 0 && <EmptyState className="mt-5" title="No candidates yet" description="Generate candidates after enabling the Phase V-A internal flags for this tester." />}
          <div className="mt-5 space-y-3">
            {candidates.map((candidate) => <CandidateCard key={candidate.id ?? candidate.theme_key} candidate={candidate} />)}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="font-bold text-forest">Would approve preview</p>
            <p className="mt-1 text-sm text-ink/58">Top candidates after ranking and fatigue policy. These are not dashboard cards.</p>
            <div className="mt-4 space-y-3">
              {approved.slice(0, 3).map((candidate) => (
                <div key={candidate.id ?? candidate.theme_key} className="rounded-2xl border border-forest/10 bg-canvas p-3">
                  <p className="text-sm font-bold text-forest">{candidate.deterministic_title}</p>
                  <p className="mt-1 text-xs text-ink/58">{candidate.category} · rank {candidate.ranking_score ?? '—'}</p>
                </div>
              ))}
              {approved.length === 0 && <p className="text-sm text-ink/58">No approved preview candidates.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-sage text-nuraa"><CreditCard size={18} /></span>
              <div>
                <p className="font-bold text-forest">Phase V-B card preview</p>
                <p className="text-sm text-ink/58">Generated dashboard cards for eligible private-beta users.</p>
              </div>
            </div>
            {cards.isLoading && <p className="mt-4 text-sm text-ink/58">Loading cards…</p>}
            {cards.data?.status === 'disabled' && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Cards disabled: {cards.data.reason}</p>}
            <div className="mt-4 space-y-3">
              {(cards.data?.cards ?? []).slice(0, 5).map((card) => <CardPreview key={card.id} card={card} />)}
              {cards.data?.status === 'completed' && (cards.data.cards ?? []).length === 0 && <p className="text-sm text-ink/58">No cards generated from approved candidates.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-bold text-forest">Phase V-C unavailable</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">Weekly reflections and notification delivery remain intentionally deferred.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function CardPreview({ card }: { card: ProactiveCard }) {
  return (
    <div className="rounded-2xl border border-forest/10 bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-forest">{card.title}</p>
        <Badge>{card.status}</Badge>
      </div>
      <p className="mt-1 text-xs leading-5 text-ink/58">{card.category} · confidence {card.confidence_score ?? '—'}</p>
      <p className="mt-2 text-xs leading-5 text-ink/62">{card.body}</p>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid size-10 place-items-center rounded-2xl bg-sage text-nuraa">{icon}</span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[.12em] text-nuraa">{label}</p>
        <p className="text-2xl font-bold text-forest">{value}</p>
      </div>
    </Card>
  )
}

function CandidateCard({ candidate }: { candidate: InsightCandidate }) {
  return (
    <div className="rounded-3xl border border-forest/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{candidate.candidate_type}</Badge>
        <Badge>{candidate.category}</Badge>
        <Badge>{candidate.severity}</Badge>
        <Badge>{candidate.confidence_label} · {candidate.confidence_score}</Badge>
        <Badge>{candidate.status}</Badge>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-bold text-forest">{candidate.deterministic_title}</p>
          <p className="mt-1 text-sm leading-6 text-ink/65">{candidate.deterministic_summary}</p>
        </div>
        <p className="shrink-0 rounded-2xl bg-canvas px-3 py-2 text-xs font-bold text-forest">Rank {candidate.ranking_score ?? '—'}</p>
      </div>
      {candidate.suppression_reason && <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Suppressed: {candidate.suppression_reason}</p>}
      <div className="mt-3 rounded-2xl bg-canvas p-3">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-nuraa">Why this candidate</p>
        <p className="mt-1 text-sm text-ink/65">{candidate.evidence_json.summary}</p>
        <ul className="mt-2 space-y-1 text-xs text-ink/58">
          {candidate.evidence_json.evidence.map((item) => (
            <li key={item.sourceReference}>{item.label}: {item.explanation}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-sage px-3 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-nuraa">{children}</span>
}
