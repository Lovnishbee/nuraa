import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, History, Info, Loader2, MessageCircle, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  archiveCoachConversation,
  createCoachFeedback,
  deleteCoachConversation,
  getCoachEligibility,
  getCoachMessages,
  listCoachConversations,
  payloadToCoachMessage,
  reopenCoachConversation,
  sendCoachFollowUp,
  setCoachConsent,
  startAskAboutToday,
  startCoachFromCard,
  startCoachHome,
  startScoreExplanation,
  updateCoachResponseDetail,
  type CoachMessageView,
} from '@/services/coachService'
import { getDashboardSummary } from '@/services/intelligence'
import { useAuthStore } from '@/stores/auth-store'
import type { AIDetailLevel, CoachResponsePayload } from '@/features/ai/types'
import { cn } from '@/lib/utils'

const starterPrompts = [
  'What should I prioritise today?',
  'Why is my score lower today?',
  'How can I protect my energy this afternoon?',
]

export function CoachPage() {
  const user = useAuthStore((state) => state.user)
  const userId = user?.id
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const requestedAction = searchParams.get('action')
  const requestedCardId = searchParams.get('card')
  const [conversationId, setConversationId] = useState<string | null>(searchParams.get('conversation'))
  const [optimisticMessages, setOptimisticMessages] = useState<CoachMessageView[]>([])
  const startedActionRef = useRef<string | null>(null)

  const eligibility = useQuery({ queryKey: ['coach-eligibility', userId], queryFn: getCoachEligibility, enabled: Boolean(userId) })
  const dashboard = useQuery({ queryKey: ['dashboard-intelligence', userId], queryFn: () => getDashboardSummary(userId!), enabled: Boolean(userId) })
  const conversations = useQuery({ queryKey: ['coach-conversations', userId], queryFn: () => listCoachConversations(userId!), enabled: Boolean(userId && eligibility.data?.coachEnabled) })
  const messages = useQuery({ queryKey: ['coach-messages', conversationId], queryFn: () => getCoachMessages(conversationId!), enabled: Boolean(conversationId) })

  const detailLevel = eligibility.data?.responseDetail ?? 'balanced'
  const activeConversation = conversations.data?.find((conversation) => conversation.id === conversationId)
  const conversationCanReceiveFollowUp = !activeConversation || activeConversation.status === 'active'
  const visibleMessages = useMemo(() => {
    const byId = new Map<string, CoachMessageView>()
    for (const message of [...(messages.data ?? []), ...optimisticMessages]) {
      const key = message.localRequestKey ?? `${message.role}:${message.messageType}:${message.content}`
      if (!byId.has(key)) byId.set(key, message)
    }
    return Array.from(byId.values())
  }, [messages.data, optimisticMessages])

  const startMutation = useMutation({
    mutationFn: async (action: string | null) => {
      if (action === 'explain_score') return startScoreExplanation(detailLevel)
      if (action === 'ask_today') return startAskAboutToday(detailLevel)
      if (action === 'coach_from_card' && requestedCardId) return startCoachFromCard(requestedCardId, detailLevel)
      return startCoachHome(detailLevel)
    },
    onSuccess: async (response) => {
      if (response.conversationId) setConversationId(response.conversationId)
      setOptimisticMessages([payloadToCoachMessage(response)])
      await queryClient.invalidateQueries({ queryKey: ['coach-conversations', userId] })
      if (response.conversationId) await queryClient.invalidateQueries({ queryKey: ['coach-messages', response.conversationId] })
    },
  })

  const followUpMutation = useMutation({
    mutationFn: ({ question, requestKey }: { question: string; requestKey: string }) => {
      if (!conversationId) throw new Error('Start a Coach conversation first.')
      return sendCoachFollowUp(conversationId, question, detailLevel, requestKey)
    },
    onMutate: ({ question, requestKey }) => {
      const optimistic: CoachMessageView = {
        id: `local_${requestKey}`,
        localRequestKey: requestKey,
        role: 'user',
        messageType: 'coach_follow_up',
        content: question,
        payload: null,
        createdAt: new Date().toISOString(),
      }
      setOptimisticMessages((current) => [...current, optimistic])
    },
    onSuccess: async (response, variables) => {
      setOptimisticMessages((current) => {
        const withoutSubmittedMessage = current.filter((message) => message.localRequestKey !== variables.requestKey)
        return [...withoutSubmittedMessage, payloadToCoachMessage(response)]
      })
      await queryClient.invalidateQueries({ queryKey: ['coach-conversations', userId] })
      await queryClient.invalidateQueries({ queryKey: ['coach-messages', conversationId] })
    },
  })

  useEffect(() => {
    if (!eligibility.data?.coachEnabled) return
    if (conversationId || startMutation.isPending) return
    if (!requestedAction && !requestedCardId && conversations.isLoading) return
    const latestActiveConversation = conversations.data?.find((conversation) => conversation.status === 'active')
    if (!requestedAction && !requestedCardId && latestActiveConversation) {
      setConversationId(latestActiveConversation.id)
      return
    }
    const actionKey = `${requestedAction || 'coach_home'}:${requestedCardId ?? ''}`
    if (startedActionRef.current === actionKey) return
    startedActionRef.current = actionKey
    startMutation.mutate(requestedAction)
  }, [conversationId, conversations.data, conversations.isLoading, eligibility.data?.coachEnabled, requestedAction, requestedCardId, startMutation])

  if (!userId) return <Navigate to="/login" replace />
  if (eligibility.isLoading) return <div className="p-6 sm:p-10"><LoadingSkeleton className="h-96" /></div>
  if (!eligibility.data?.coachEnabled) return <CoachConsent userId={userId} detailLevel={detailLevel} />

  return (
    <div className="mx-auto grid max-w-[1320px] gap-5 p-4 pb-28 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
      <main className="min-h-[calc(100vh-5rem)] rounded-[28px] border border-forest/10 bg-white/82 p-4 shadow-[0_22px_70px_rgba(22,52,47,.08)] backdrop-blur sm:p-6">
        <header className="flex flex-col gap-3 border-b border-forest/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-nuraa"><Sparkles size={15} /> Nuraa Coach</p>
            <h1 className="display mt-2 text-4xl leading-none text-forest">Based on today</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/62">Contextual general wellness guidance grounded in your Nuraa Score and deterministic daily brief.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setConversationId(null)
            setOptimisticMessages([])
            startedActionRef.current = null
            startMutation.mutate(null)
          }}>Start fresh</Button>
        </header>

        <div className="mt-5 space-y-4" aria-live="polite">
          {startMutation.isPending && !visibleMessages.length && <CoachLoadingCard />}
          {!startMutation.isPending && !visibleMessages.length && <CoachOpeningCard onStart={(prompt) => startMutation.mutate(prompt)} />}
          {visibleMessages.map((message) => (
            <CoachMessageCard
              key={message.id}
              message={message}
              conversationId={conversationId}
              userId={userId}
              onPrompt={(prompt) => followUpMutation.mutate({ question: prompt, requestKey: `follow_${crypto.randomUUID()}` })}
            />
          ))}
          {(startMutation.error || followUpMutation.error) && (
            <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Nuraa Coach is temporarily unavailable. Your deterministic dashboard insights are still available.
            </Card>
          )}
        </div>

        <CoachComposer
          disabled={!conversationId || !conversationCanReceiveFollowUp || followUpMutation.isPending || startMutation.isPending}
          suggestedPrompts={lastSuggestedPrompts(visibleMessages)}
          onSend={(question) => followUpMutation.mutate({ question, requestKey: `follow_${crypto.randomUUID()}` })}
        />
      </main>

      <aside className="space-y-4">
        <TodayContextRail detailLevel={detailLevel} onDetailChange={(value) => void updateCoachResponseDetail(userId, value).then(() => queryClient.invalidateQueries({ queryKey: ['coach-eligibility', userId] }))} dashboard={dashboard.data} />
        <RecentConversations
          conversations={conversations.data ?? []}
          activeConversationId={conversationId}
          onOpen={(id) => {
            setConversationId(id)
            setOptimisticMessages([])
          }}
          onArchive={(id) => archiveCoachConversation(id).then(() => queryClient.invalidateQueries({ queryKey: ['coach-conversations', userId] }))}
          onReopen={(id) => reopenCoachConversation(id).then(() => queryClient.invalidateQueries({ queryKey: ['coach-conversations', userId] }))}
          onDelete={(id) => deleteCoachConversation(id).then(() => {
            if (conversationId === id) setConversationId(null)
            return queryClient.invalidateQueries({ queryKey: ['coach-conversations', userId] })
          })}
        />
      </aside>
    </div>
  )
}

function CoachConsent({ userId, detailLevel }: { userId: string; detailLevel: AIDetailLevel }) {
  const queryClient = useQueryClient()
  const enable = useMutation({
    mutationFn: () => setCoachConsent(userId, true, detailLevel),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-eligibility', userId] }),
  })
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-3xl place-items-center p-5">
      <Card className="p-7 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Private beta</p>
        <h1 className="display mt-3 text-4xl text-forest">Enable Nuraa Coach</h1>
        <p className="mt-4 text-base leading-7 text-ink/68">Use your recent wellness data and Nuraa Score to receive contextual general wellness guidance. Nuraa does not diagnose conditions or prescribe treatment.</p>
        <div className="mt-6 rounded-2xl border border-forest/10 bg-sage/55 p-4 text-sm leading-6 text-forest/72">
          Nuraa uses only approved high-level wellness context for Coach. Deterministic insights continue working if Coach is off.
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => enable.mutate()} disabled={enable.isPending}>{enable.isPending && <Loader2 className="animate-spin" size={16} />} Enable Coach</Button>
          <Button variant="outline" onClick={() => history.back()}>Not now</Button>
          <Button variant="ghost" asChild><a href="/docs/phase4b-coach-smoke-test.md" target="_blank" rel="noreferrer">Learn how Nuraa uses your data</a></Button>
        </div>
      </Card>
    </div>
  )
}

function CoachOpeningCard({ onStart }: { onStart: (action: string | null) => void }) {
  return (
    <Card className="bg-sage/55 p-6">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Contextual start</p>
      <h2 className="mt-3 text-2xl font-bold text-forest">Your Coach is ready to use today’s Nuraa context.</h2>
      <p className="mt-2 text-sm leading-6 text-ink/64">Start with today’s focus, your score, or a practical plan. This is not a generic blank chatbot.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => onStart('ask_today')} size="sm">Ask about today</Button>
        <Button onClick={() => onStart('explain_score')} variant="secondary" size="sm">Explain my score</Button>
      </div>
    </Card>
  )
}

function CoachLoadingCard() {
  return <Card className="p-5"><LoadingSkeleton className="h-28" /></Card>
}

function CoachMessageCard({ message, conversationId, userId, onPrompt }: { message: CoachMessageView; conversationId: string | null; userId: string; onPrompt: (prompt: string) => void }) {
  const payload = message.payload
  return (
    <article className={cn('rounded-[24px] border p-5', message.role === 'user' ? 'ml-auto max-w-[760px] border-nuraa/15 bg-sage/70' : 'border-forest/10 bg-white')}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-nuraa">{message.role === 'user' ? 'You' : 'Nuraa'}</p>
      {payload?.headline ? <h2 className="mt-2 text-2xl font-bold leading-tight text-forest">{payload.headline}</h2> : null}
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink/70">{payload?.summary ?? message.content}</p>
      {payload?.factualBasis?.length ? <WhyThisGuidance basis={payload.factualBasis} /> : null}
      {payload?.primaryAction || payload?.primaryFocus ? (
        <div className="mt-4 rounded-2xl border border-nuraa/12 bg-sage/55 p-4">
          <p className="text-sm font-bold text-forest">{(payload.primaryAction ?? payload.primaryFocus)?.title}</p>
          <p className="mt-1 text-sm leading-6 text-ink/64">{(payload.primaryAction ?? payload.primaryFocus)?.detail}</p>
        </div>
      ) : null}
      {payload?.confidenceNote ? <p className="mt-3 text-xs leading-5 text-ink/55">{payload.confidenceNote}</p> : null}
      {payload?.suggestedPrompts?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {payload.suggestedPrompts.slice(0, 3).map((prompt) => <button key={prompt} type="button" onClick={() => onPrompt(prompt)} className="rounded-full border border-nuraa/20 bg-white px-3 py-1.5 text-xs font-semibold text-forest hover:bg-sage">{prompt}</button>)}
        </div>
      ) : null}
      {message.role === 'nuraa' && conversationId && !message.id.startsWith('local_') ? <FeedbackControls userId={userId} conversationId={conversationId} messageId={message.id} /> : null}
    </article>
  )
}

function WhyThisGuidance({ basis }: { basis: NonNullable<CoachResponsePayload['factualBasis']> }) {
  return (
    <details className="mt-4 rounded-2xl border border-forest/10 bg-canvas/70 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-forest"><Info size={15} /> Why this guidance?</summary>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/64">
        {basis.slice(0, 2).map((item) => <li key={`${item.label}-${item.sourceReference}`}>{item.label}</li>)}
      </ul>
    </details>
  )
}

function FeedbackControls({ userId, conversationId, messageId }: { userId: string; conversationId: string; messageId: string }) {
  const [sent, setSent] = useState<string | null>(null)
  const feedback = useMutation({
    mutationFn: (feedbackType: 'helpful' | 'not_helpful') => createCoachFeedback({ userId, conversationId, messageId, feedbackType }),
    onSuccess: (_data, feedbackType) => setSent(feedbackType),
  })
  return (
    <div className="mt-4 flex items-center gap-2 text-xs text-ink/55">
      <span>{sent ? 'Feedback saved.' : 'Was this helpful?'}</span>
      <button aria-label="Helpful" type="button" disabled={Boolean(sent) || feedback.isPending} onClick={() => feedback.mutate('helpful')} className="rounded-full p-1.5 hover:bg-sage"><ThumbsUp size={14} /></button>
      <button aria-label="Not helpful" type="button" disabled={Boolean(sent) || feedback.isPending} onClick={() => feedback.mutate('not_helpful')} className="rounded-full p-1.5 hover:bg-sage"><ThumbsDown size={14} /></button>
    </div>
  )
}

function CoachComposer({ disabled, suggestedPrompts, onSend }: { disabled: boolean; suggestedPrompts: string[]; onSend: (question: string) => void }) {
  const [value, setValue] = useState('')
  function submit(question = value) {
    const trimmed = question.trim()
    if (!trimmed || disabled) return
    onSend(trimmed.slice(0, 500))
    setValue('')
  }
  return (
    <div className="sticky bottom-20 mt-6 rounded-[24px] border border-forest/10 bg-white/95 p-3 shadow-[0_18px_45px_rgba(22,52,47,.12)] backdrop-blur md:bottom-4">
      {suggestedPrompts.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {suggestedPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => submit(prompt)} disabled={disabled} className="shrink-0 rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-forest disabled:opacity-50">{prompt}</button>)}
        </div>
      )}
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); submit() }}>
        <label className="sr-only" htmlFor="coach-question">Ask Nuraa Coach</label>
        <textarea id="coach-question" value={value} onChange={(event) => setValue(event.target.value.slice(0, 500))} disabled={disabled} rows={1} className="min-h-11 flex-1 resize-none rounded-2xl border border-forest/12 bg-canvas px-4 py-3 text-sm text-forest outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/20" placeholder="Ask about today’s guidance…" />
        <Button type="submit" disabled={disabled || !value.trim()} aria-label="Send message"><Send size={16} /></Button>
      </form>
    </div>
  )
}

function TodayContextRail({ detailLevel, onDetailChange, dashboard }: { detailLevel: AIDetailLevel; onDetailChange: (value: AIDetailLevel) => void; dashboard: Awaited<ReturnType<typeof import('@/services/intelligence').getDashboardSummary>> | undefined }) {
  const score = dashboard?.score
  const focus = Array.isArray(dashboard?.brief?.focus_items) ? dashboard?.brief?.focus_items?.[0] as { title?: string; description?: string } | undefined : undefined
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Today in context</p>
      <div className="mt-4 rounded-2xl bg-forest p-5 text-white">
        <p className="text-sm text-white/70">Nuraa Score</p>
        <p className="mt-1 text-4xl font-bold">{score?.total_score ?? '—'}</p>
        <p className="mt-1 text-sm text-white/78">{score?.readiness_category ?? 'Building baseline'}</p>
      </div>
      <div className="mt-4 rounded-2xl bg-sage/60 p-4">
        <p className="text-sm font-bold text-forest">Today’s focus</p>
        <p className="mt-1 text-sm leading-6 text-ink/64">{focus?.title ?? score?.recommended_focus ?? 'Complete a check-in to sharpen today’s focus.'}</p>
      </div>
      <label className="mt-5 block text-sm font-bold text-forest" htmlFor="coach-detail">Response detail</label>
      <select id="coach-detail" value={detailLevel} onChange={(event) => onDetailChange(event.target.value as AIDetailLevel)} className="mt-2 w-full rounded-2xl border border-forest/12 bg-white px-3 py-2 text-sm text-forest">
        <option value="concise">Concise</option>
        <option value="balanced">Balanced</option>
        <option value="detailed">Detailed</option>
      </select>
    </Card>
  )
}

function RecentConversations({ conversations, activeConversationId, onOpen, onArchive, onReopen, onDelete }: { conversations: Array<{ id: string; deterministic_title: string | null; entry_point: string; last_active_at: string; archived_at: string | null; status: string }>; activeConversationId: string | null; onOpen: (id: string) => void; onArchive: (id: string) => void; onReopen: (id: string) => void; onDelete: (id: string) => void }) {
  const visible = conversations.filter((conversation) => conversation.status !== 'deleted')
  const active = visible.filter((conversation) => conversation.status !== 'archived')
  const archived = visible.filter((conversation) => conversation.status === 'archived')
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-forest"><History size={16} /> Recent conversations</p>
      <div className="mt-4 space-y-2">
        {visible.length === 0 && <p className="rounded-2xl bg-canvas p-4 text-sm text-ink/60">Your Coach history will appear here after the first response.</p>}
        {active.map((conversation) => (
          <ConversationHistoryRow key={conversation.id} conversation={conversation} activeConversationId={activeConversationId} onOpen={onOpen} onArchive={onArchive} onDelete={onDelete} />
        ))}
        {archived.length > 0 ? (
          <details className="pt-2">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[.12em] text-ink/55">Archived conversations</summary>
            <div className="mt-2 space-y-2">
              {archived.map((conversation) => (
                <ConversationHistoryRow key={conversation.id} conversation={conversation} activeConversationId={activeConversationId} onOpen={onOpen} onArchive={onArchive} onReopen={onReopen} onDelete={onDelete} />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  )
}

function ConversationHistoryRow({ conversation, activeConversationId, onOpen, onArchive, onReopen, onDelete }: { conversation: { id: string; deterministic_title: string | null; entry_point: string; status: string }; activeConversationId: string | null; onOpen: (id: string) => void; onArchive: (id: string) => void; onReopen?: (id: string) => void; onDelete: (id: string) => void }) {
  const archived = conversation.status === 'archived'
  return (
    <div className={cn('rounded-2xl border p-3', activeConversationId === conversation.id ? 'border-nuraa bg-sage/60' : 'border-forest/10 bg-white')}>
      <button type="button" onClick={() => onOpen(conversation.id)} className="flex w-full items-start gap-2 text-left">
        <MessageCircle size={16} className="mt-0.5 text-nuraa" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-forest">{conversation.deterministic_title ?? 'Coach conversation'}</span>
          <span className="block text-xs text-ink/55">{archived ? 'Archived · read only' : conversation.entry_point.replaceAll('_', ' ')}</span>
        </span>
      </button>
      <div className="mt-2 flex gap-2">
        {archived
          ? <button type="button" onClick={() => onReopen?.(conversation.id)} className="rounded-full px-2 py-1 text-xs font-semibold text-nuraa hover:bg-sage">Reopen</button>
          : <button type="button" onClick={() => onArchive(conversation.id)} className="rounded-full p-1.5 text-ink/55 hover:bg-sage" aria-label="Archive conversation"><Archive size={14} /></button>}
        <button type="button" onClick={() => onDelete(conversation.id)} className="rounded-full p-1.5 text-ink/55 hover:bg-sage" aria-label="Delete conversation"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

function lastSuggestedPrompts(messages: CoachMessageView[]) {
  const latest = [...messages].reverse().find((message) => message.payload?.suggestedPrompts?.length)
  return latest?.payload?.suggestedPrompts?.slice(0, 3) ?? starterPrompts
}
