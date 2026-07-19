import { useMutation, useQuery } from '@tanstack/react-query'
import { Bot, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { MobileHeader } from '@/components/app/MobileHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCurrentTimestamp } from '@/lib/date'
import { getAIInternalAccessStatus } from '@/services/aiGateway'
import { runInternalAITask } from '../api'
import type { AITaskType } from '../types'

const tasks: { label: string; value: AITaskType }[] = [
  { label: 'Rewrite Daily Brief', value: 'rewrite_daily_brief' },
  { label: 'Explain Score', value: 'explain_score' },
  { label: 'Ask About Today', value: 'ask_about_today' },
]

export function AIRuntimeDevPage() {
  const [taskType, setTaskType] = useState<AITaskType>('rewrite_daily_brief')
  const [question, setQuestion] = useState('')
  const access = useQuery({
    queryKey: ['ai-internal-access'],
    queryFn: getAIInternalAccessStatus,
    retry: false,
    staleTime: 30_000,
  })
  const mutation = useMutation({
    mutationFn: () => runInternalAITask({
      taskType,
      detailLevel: 'balanced',
      userInput: question.trim() ? { question: question.trim() } : undefined,
      idempotencyKey: `dev_${taskType}_${getCurrentTimestamp().replace(/[^0-9A-Za-z]/g, '')}`,
    }),
  })

  if (access.isLoading || access.isPending) {
    return <div className="grid min-h-[60vh] place-items-center bg-canvas"><p className="text-sm font-semibold text-forest/60">Checking internal access…</p></div>
  }

  if (access.isError || !access.data.enabled || !access.data.consentGranted) {
    return <Navigate to="/app/dashboard" replace />
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-5 sm:px-7 lg:px-10 lg:py-8">
      <MobileHeader />
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-nuraa">Internal dev</p>
          <h1 className="display mt-2 text-4xl leading-none text-forest">AI runtime test surface.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Runs the controlled Phase 4A gateway only. It never displays prompts, secrets, raw provider output, or context envelopes.</p>
        </div>
        <span className="hidden rounded-2xl bg-sage px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-nuraa sm:inline-flex">Not public nav</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-sage text-nuraa"><Bot size={20} /></span>
            <div>
              <p className="font-bold text-forest">Runtime task</p>
              <p className="text-sm text-ink/58">Internal testers only.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            {tasks.map((task) => (
              <button
                key={task.value}
                type="button"
                onClick={() => setTaskType(task.value)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${taskType === task.value ? 'border-nuraa bg-sage text-forest' : 'border-forest/10 bg-white text-ink/70 hover:border-nuraa/30'}`}
              >
                {task.label}
              </button>
            ))}
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-bold text-forest">Optional question</span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={500}
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-forest/15 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-nuraa focus:ring-2 focus:ring-nuraa/15"
              placeholder="Ask about today using existing deterministic context..."
            />
          </label>

          <Button className="mt-5 w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Running…' : 'Run internal task'}
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-sage text-nuraa"><ShieldCheck size={20} /></span>
            <div>
              <p className="font-bold text-forest">Approved output only</p>
              <p className="text-sm text-ink/58">Safe metadata and validated payload.</p>
            </div>
          </div>

          {mutation.isIdle && <EmptyState className="mt-5" title="No runtime result yet" description="Run one internal task to inspect the safe structured response." />}
          {mutation.isError && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{mutation.error instanceof Error ? mutation.error.message : 'Unable to run AI runtime task.'}</p>}
          {mutation.data && (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Meta label="Task" value={mutation.data.taskType} />
                <Meta label="Status" value={mutation.data.status} />
                <Meta label="Fallback" value={mutation.data.fallbackUsed ? 'yes' : 'no'} />
                <Meta label="Schema valid" value={mutation.data.safeMeta.schemaValidationPassed === false ? 'no' : 'yes'} />
                <Meta label="Latency" value={mutation.data.safeMeta.latencyMs ? `${mutation.data.safeMeta.latencyMs}ms` : '—'} />
                <Meta label="Schema" value={mutation.data.safeMeta.responseSchemaVersion} />
              </div>
              <pre className="max-h-[460px] overflow-auto rounded-3xl bg-forest p-4 text-xs leading-6 text-white/86">{JSON.stringify(mutation.data.payload, null, 2)}</pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-forest/10 bg-canvas p-3">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-nuraa">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-forest">{value}</p>
    </div>
  )
}
