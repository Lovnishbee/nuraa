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

  if (taskType === 'ask_about_today') return {
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

  if (taskType === 'rewrite_weekly_reflection') {
    const weekly = readRecord(context.weeklyReflection)
    const payload = readRecord(weekly.summary_payload)
    const weekAtGlance = readRecord(payload.weekAtGlance)
    const focus = readRecord(payload.nextWeekFocus)
    return {
      headline: readString(payload, 'headline', 'Your weekly reflection is ready.'),
      weekAtGlance: {
        summary: readString(weekAtGlance, 'summary', 'Nuraa summarised the week from available deterministic signals.'),
        averageScore: typeof weekAtGlance.averageScore === 'number' ? weekAtGlance.averageScore : null,
        scoreDirection: readScoreDirection(weekAtGlance.scoreDirection),
        confidence: readConfidence(weekAtGlance.confidence),
      },
      whatChanged: readArray(payload.whatChanged),
      whatSupportedYou: readArray(payload.whatSupportedYou),
      attentionAreas: readArray(payload.attentionAreas),
      nextWeekFocus: {
        title: readString(focus, 'title', 'Keep one steady habit'),
        detail: readString(focus, 'detail', 'Repeat the smallest useful action that helped this week.'),
      },
      suggestedCoachPrompts: readStringArray(payload.suggestedCoachPrompts).slice(0, 3).length
        ? readStringArray(payload.suggestedCoachPrompts).slice(0, 3)
        : ['What mattered most this week?'],
      confidenceNote: readNullableString(payload, 'confidenceNote'),
      sourceReferences: references,
    }
  }

  return {
    headline: 'Your health context is still available.',
    summary: 'Nuraa’s conversational guidance is temporarily unavailable. Here is what matters most today.',
    factualBasis: references.slice(0, 2).map((sourceReference) => ({ label: sourceReference, sourceReference })),
    interpretations: [{
      statement: 'This response uses deterministic Nuraa context while conversational guidance is unavailable.',
      confidence: 'moderate' as const,
    }],
    primaryAction: { title: actionTitle, detail: actionDetail },
    clarificationQuestion: null,
    suggestedPrompts: [
      'What should I prioritise today?',
      'Why is this my focus?',
      'What data is missing?',
    ],
    confidenceNote: context.confidenceNotes[0] ?? FALLBACK_COPY,
    sourceReferences: references,
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function readArray(value: unknown): Array<{ title: string; explanation: string; sourceReference: string }> {
  return Array.isArray(value) ? value.filter((item): item is { title: string; explanation: string; sourceReference: string } => Boolean(item && typeof item === 'object')) : []
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function readNullableString(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object') return null
  const item = (value as Record<string, unknown>)[key]
  return typeof item === 'string' ? item : null
}

function readScoreDirection(value: unknown): 'up' | 'down' | 'stable' | 'insufficient_data' {
  return value === 'up' || value === 'down' || value === 'stable' || value === 'insufficient_data' ? value : 'insufficient_data'
}

function readConfidence(value: unknown): 'high' | 'moderate' | 'low' {
  return value === 'high' || value === 'moderate' || value === 'low' ? value : 'low'
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
