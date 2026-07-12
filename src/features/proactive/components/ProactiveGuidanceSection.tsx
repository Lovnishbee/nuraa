import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BellOff, ChevronRight, Clock, MessageCircle, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { cn } from '@/lib/utils'
import { dismissProactiveCard, markProactiveCardShown, snoozeProactiveCard, startProactiveCardCoachHandoff, submitProactiveCardFeedback } from '@/services/proactiveCards'
import { SectionHeader } from '@/features/dashboard/components/SectionHeader'
import { DashboardCard } from '@/features/dashboard/components/DashboardCard'
import type { ProactiveCard, ProactiveCardFeedbackType } from '../types'

export function ProactiveGuidanceSection({
  cards,
  isLoading,
  isError,
  enabled,
  coachEnabled,
  onRetry,
}: {
  cards: ProactiveCard[]
  isLoading: boolean
  isError: boolean
  enabled: boolean
  coachEnabled: boolean
  onRetry: () => void
}) {
  const visibleCards = cards.filter((card) => card.status === 'active' || card.status === 'shown').slice(0, 3)

  if (!enabled && !isLoading) return null
  if (!isLoading && !isError && visibleCards.length === 0) return null

  return (
    <section>
      <SectionHeader title="Today’s guidance" eyebrow="Proactive beta" />
      <div className="mt-4">
        {isLoading && <LoadingSkeleton className="h-48" />}
        {isError && (
          <DashboardCard status="error" onRetry={onRetry} title="Guidance unavailable">
            <span />
          </DashboardCard>
        )}
        {!isLoading && !isError && visibleCards.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-3">
            {visibleCards.map((card) => (
              <ProactiveGuidanceCard key={card.id} card={card} coachEnabled={coachEnabled} />
            ))}
          </div>
        )}
        {!isLoading && !isError && enabled && visibleCards.length === 0 && (
          <EmptyState title="No proactive cards today" description="Nuraa will surface guidance when there is enough safe signal and a clear action." />
        )}
      </div>
    </section>
  )
}

function ProactiveGuidanceCard({ card, coachEnabled }: { card: ProactiveCard; coachEnabled: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [feedbackSent, setFeedbackSent] = useState<ProactiveCardFeedbackType | null>(null)

  useEffect(() => {
    if (card.shown_at) return
    void markProactiveCardShown(card.id).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['proactive-cards'] })
    }).catch(() => undefined)
  }, [card.id, card.shown_at, queryClient])

  const dismiss = useMutation({
    mutationFn: () => dismissProactiveCard(card.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proactive-cards'] }),
  })
  const snooze = useMutation({
    mutationFn: () => snoozeProactiveCard(card.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proactive-cards'] }),
  })
  const feedback = useMutation({
    mutationFn: (type: ProactiveCardFeedbackType) => submitProactiveCardFeedback(card.id, type),
    onSuccess: (_data, type) => {
      setFeedbackSent(type)
      void queryClient.invalidateQueries({ queryKey: ['proactive-cards'] })
    },
  })
  const coach = useMutation({
    mutationFn: () => startProactiveCardCoachHandoff(card.id),
    onSuccess: () => navigate(`/app/coach?action=ask_today&card=${card.id}`),
  })

  const busy = dismiss.isPending || snooze.isPending || feedback.isPending || coach.isPending

  return (
    <article className={cn(
      'rounded-[24px] border p-5 shadow-[0_16px_42px_rgba(22,52,47,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_54px_rgba(22,52,47,.1)]',
      card.severity === 'high' ? 'border-amber-200 bg-amber-50/70' : 'border-forest/10 bg-white/84 backdrop-blur',
    )}>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-sage px-3 py-1 text-[11px] font-bold uppercase tracking-[.1em] text-nuraa">
          <Sparkles size={13} /> {card.category.replace('_', ' ')}
        </span>
        <button type="button" disabled={busy} onClick={() => dismiss.mutate()} className="rounded-full p-1.5 text-ink/45 hover:bg-sage hover:text-forest" aria-label="Dismiss guidance">
          <X size={16} />
        </button>
      </div>
      <h3 className="mt-4 text-xl font-bold leading-tight text-forest">{card.title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/65">{card.body}</p>

      {card.primary_action_label && (
        <div className="mt-4 rounded-2xl border border-nuraa/12 bg-sage/55 p-4">
          <p className="text-sm font-bold text-forest">{card.primary_action_label}</p>
          {typeof card.primary_action_payload?.detail === 'string' && <p className="mt-1 text-sm leading-6 text-ink/62">{card.primary_action_payload.detail}</p>}
        </div>
      )}

      <details className="mt-4 rounded-2xl border border-forest/10 bg-canvas/70 p-3">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-[.1em] text-nuraa">Why this card?</summary>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-ink/60">
          {card.evidence_refs.slice(0, 3).map((item) => <li key={item.sourceReference}>{item.label}: {item.explanation}</li>)}
        </ul>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || Boolean(feedbackSent)} onClick={() => feedback.mutate('helpful')} className="inline-flex items-center gap-1 rounded-full border border-forest/10 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-sage">
          <ThumbsUp size={13} /> Helpful
        </button>
        <button type="button" disabled={busy || Boolean(feedbackSent)} onClick={() => feedback.mutate('not_helpful')} className="inline-flex items-center gap-1 rounded-full border border-forest/10 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-sage">
          <ThumbsDown size={13} /> Not helpful
        </button>
        <button type="button" disabled={busy} onClick={() => snooze.mutate()} className="inline-flex items-center gap-1 rounded-full border border-forest/10 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-sage">
          <Clock size={13} /> Snooze
        </button>
        <button type="button" disabled={busy || Boolean(feedbackSent)} onClick={() => feedback.mutate('show_less_like_this')} className="inline-flex items-center gap-1 rounded-full border border-forest/10 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-sage">
          <BellOff size={13} /> Show less
        </button>
      </div>

      {coachEnabled && (
        <Button disabled={busy} onClick={() => coach.mutate()} variant="secondary" size="sm" className="mt-4 w-full justify-between">
          <span className="inline-flex items-center gap-2"><MessageCircle size={15} /> Ask Coach</span>
          <ChevronRight size={15} />
        </Button>
      )}

      <p className="mt-3 text-[11px] leading-5 text-ink/45">Confidence {card.confidence_score ?? '—'} · {card.copy_source === 'ai_rewrite' ? 'AI-reviewed copy' : 'Deterministic guidance'}</p>
    </article>
  )
}
