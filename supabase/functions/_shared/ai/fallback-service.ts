import type { AIResponsePayload, ContextEnvelope, TaskType } from './types.ts'

export const FALLBACK_COPY = 'Your personalised health insights are still available. The conversational coach is temporarily unavailable.'

export function buildFallback(taskType: TaskType, context: ContextEnvelope): AIResponsePayload {
  // Phase 4A keeps deterministic Phase 3 intelligence as source of truth; AI can fail closed to this copy.
  const references = context.sourceReferences.length ? context.sourceReferences.slice(0, 6) : ['deterministic:nuraa']
  const score = readDisplayValue(context.currentHealthState, 'score', 'Your current score is not available yet.')
  const category = readString(context.currentHealthState, 'category', 'Nuraa is still building your baseline.')
  const briefHeadline = readString(context.currentHealthState, 'dailyBriefHeadline', 'Your daily brief is still available.')
  const briefSummary = readString(context.currentHealthState, 'dailyBriefSummary', FALLBACK_COPY)
  const firstPriority = context.activePriorities[0]
  const actionTitle = readString(firstPriority, 'title', 'Keep today simple')
  const actionDetail = readString(firstPriority, 'description', 'Focus on one steady habit and update your check-in when ready.')

  if (taskType === 'rewrite_daily_brief') {
    return {
      headline: briefHeadline,
      summary: briefSummary,
      primaryAction: { title: actionTitle, detail: actionDetail },
      confidenceNote: FALLBACK_COPY,
      sourceReferences: references,
    }
  }

  if (taskType === 'explain_score') {
    return {
      headline: `${score} · ${category}`,
      summary: readString(context.currentHealthState, 'scoreReason', FALLBACK_COPY),
      factualBasis: references.slice(0, 4).map((sourceReference) => ({ label: sourceReference, sourceReference })),
      interpretations: context.explanationPaths.slice(0, 3).map((path) => ({
        statement: readString(path, 'statement', 'This factor comes from deterministic Nuraa intelligence.'),
        confidence: 'moderate' as const,
      })),
      primaryAction: { title: actionTitle, detail: actionDetail },
      confidenceNote: context.confidenceNotes[0] ?? FALLBACK_COPY,
      followUpQuestions: ['What should I focus on today?', 'Why did my score change?', 'What can improve my recovery?'],
      sourceReferences: references,
    }
  }

  return {
    headline: briefHeadline,
    summary: briefSummary,
    primaryFocus: { title: actionTitle, detail: actionDetail },
    factualBasis: references.slice(0, 4).map((sourceReference) => ({ label: sourceReference, sourceReference })),
    suggestedPrompts: [
      'Why is this my focus today?',
      'What is one simple action I can take?',
      'What data is missing from my baseline?',
    ],
    confidenceNote: context.confidenceNotes[0] ?? FALLBACK_COPY,
    sourceReferences: references,
  }
}

function readString(value: unknown, key: string, fallback: string): string {
  if (!value || typeof value !== 'object') return fallback
  const record = value as Record<string, unknown>
  const item = record[key]
  return typeof item === 'string' && item.trim() ? item : fallback
}

function readDisplayValue(value: unknown, key: string, fallback: string): string {
  if (!value || typeof value !== 'object') return fallback
  const item = (value as Record<string, unknown>)[key]
  if (typeof item === 'number' && Number.isFinite(item)) return String(item)
  return typeof item === 'string' && item.trim() ? item : fallback
}
