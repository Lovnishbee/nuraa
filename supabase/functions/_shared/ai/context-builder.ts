import { getLocalISODate, getTimeOfDay, addMinutes } from './date.ts'
import { flagForTask } from './feature-flags.ts'
import { stableJsonHash } from './hash.ts'
import { createContextEnvelopeMetadata, createContextItems, createContextRequest } from './repositories/ai-runtime.repository.ts'
import { getRecentCoachMessages } from './repositories/coach.repository.ts'
import { getRuntimeDataSnapshot } from './repositories/intelligence.repository.ts'
import { getUserCoachingPreferences } from './repositories/preferences.repository.ts'
import { ContextEnvelopeSchema } from './schemas.ts'
import type { AIRequestInput, ContextEnvelope, RuntimeSupabaseClient } from './types.ts'

export async function buildContextEnvelope(options: {
  client: RuntimeSupabaseClient
  userId: string
  input: AIRequestInput
  now?: Date
}): Promise<ContextEnvelope> {
  const now = options.now ?? new Date()
  const snapshot = await getRuntimeDataSnapshot(options.client, options.userId)
  const coachMessages = options.input.conversationId
    ? await getRecentCoachMessages(options.client, options.input.conversationId, options.userId)
    : []
  const preferences = await getUserCoachingPreferences(options.client, options.userId)
  const timezone = snapshot.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const expiresAt = addMinutes(now, 15).toISOString()
  const sourceReferences = buildSourceReferences(snapshot)
  const priorities = buildPriorities(snapshot)
  const envelope: ContextEnvelope = {
    id: crypto.randomUUID(),
    schemaVersion: options.input.entryPoint === 'internal_dev' ? 'phase4a.v1' : 'phase4b.v1',
    taskType: options.input.taskType,
    createdAt: now.toISOString(),
    expiresAt,
    currentMoment: {
      healthDate: getLocalISODate(timezone, now),
      timezone,
      timeOfDay: getTimeOfDay(timezone, now),
    },
    userPreferences: {
      coachingDetailLevel: options.input.detailLevel ?? preferences.coachingDetailLevel,
      coachingTone: preferences.coachingTone,
    },
    currentHealthState: {
      score: readNumber(snapshot.score, 'total_score'),
      category: readString(snapshot.score, 'readiness_category'),
      scoreReason: readString(snapshot.score, 'score_reason'),
      recommendedFocus: readString(snapshot.score, 'recommended_focus'),
      dailyBriefHeadline: snapshot.brief?.headline ?? null,
      dailyBriefSummary: snapshot.brief?.summary ?? null,
      signalConfidence: readNumber(snapshot.signal, 'overall_signal_confidence'),
    },
    relevantTrends: buildSevenDayTrendSummaries(snapshot),
    activePriorities: priorities.slice(0, 3),
    activeGoals: snapshot.goals.slice(0, 3).map((goal) => ({
      id: readString(goal, 'id'),
      label: readString(goal, 'goal_label'),
      priority: readNumber(goal, 'priority'),
    })),
    confidenceNotes: buildConfidenceNotes(snapshot),
    missingInformation: buildMissingInformation(snapshot),
    sourceReferences,
    priorCoachMessages: coachMessages.map((message) => ({
      role: message.role,
      messageType: message.message_type,
      content: visibleMessageContent(message).slice(0, 500),
      createdAt: message.created_at,
    })),
    explanationPaths: buildExplanationPaths(snapshot),
    safetyConstraints: {
      medicalAdviceProhibited: true,
      medicationAdviceProhibited: true,
      diagnosisProhibited: true,
    },
  }

  const parsed = ContextEnvelopeSchema.parse(envelope)
  const contextRequest = await createContextRequest(options.client, {
    userId: options.userId,
    taskType: options.input.taskType,
    triggerType: options.input.entryPoint,
    featureName: flagForTask(options.input.taskType),
  })
  const hash = await stableJsonHash(parsed)
  const metadata = await createContextEnvelopeMetadata(options.client, {
    contextRequestId: contextRequest.id,
    schemaVersion: parsed.schemaVersion,
    contextHash: hash,
    sensitivityLevel: 'low',
    expiresAt: parsed.expiresAt,
  })
  await createContextItems(options.client, metadata.id, sourceReferences.map((reference) => ({
    category: reference.split(':')[0],
    sourceReferenceId: parseUuidSource(reference),
    inclusionReason: 'Included as concise deterministic Phase 3 context',
  })))

  return { ...parsed, id: metadata.id }
}

function buildSevenDayTrendSummaries(snapshot: Awaited<ReturnType<typeof getRuntimeDataSnapshot>>): Array<Record<string, unknown>> {
  const scores = snapshot.scoreHistory
    .map((score) => ({
      date: readString(score, 'score_date'),
      score: readNumber(score, 'total_score'),
      category: readString(score, 'readiness_category'),
    }))
    .filter((score): score is { date: string; score: number; category: string } => Boolean(score.date && typeof score.score === 'number'))

  if (!scores.length) {
    return [{ label: 'Limited data', summary: 'Nuraa does not have recent score history yet.', sourceReference: 'deterministic:nuraa' }]
  }

  const current = scores[0]
  const previous = scores[1]
  const summaries: Array<Record<string, unknown>> = [{
    label: 'Current readiness',
    summary: `Current score is ${current.score} (${current.category || 'category building'}).`,
    sourceReference: snapshot.score ? `score:${readString(snapshot.score, 'id')}` : 'deterministic:nuraa',
  }]

  if (previous) {
    const delta = current.score - previous.score
    summaries.push({
      label: 'Change from previous score',
      summary: delta === 0 ? 'Score is unchanged from the previous recorded score.' : `Score is ${Math.abs(delta)} point${Math.abs(delta) === 1 ? '' : 's'} ${delta > 0 ? 'higher' : 'lower'} than the previous recorded score.`,
      sourceReference: snapshot.score ? `score:${readString(snapshot.score, 'id')}` : 'deterministic:nuraa',
    })
  } else {
    summaries.push({
      label: 'Limited trend data',
      summary: 'Nuraa needs more recent scores to compare direction reliably.',
      sourceReference: 'deterministic:nuraa',
    })
  }

  if (scores.length >= 3) {
    const average = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length)
    const min = Math.min(...scores.map((item) => item.score))
    const max = Math.max(...scores.map((item) => item.score))
    summaries.push({
      label: `${scores.length}-score baseline`,
      summary: `Recent average is ${average}, with scores ranging from ${min} to ${max}.`,
      sourceReference: snapshot.score ? `score:${readString(snapshot.score, 'id')}` : 'deterministic:nuraa',
    })
  }

  return summaries.slice(0, 3)
}

function visibleMessageContent(message: { content: string | null; structured_payload: unknown | null }) {
  if (message.content?.trim()) return message.content.trim()
  if (message.structured_payload && typeof message.structured_payload === 'object') {
    const record = message.structured_payload as Record<string, unknown>
    return [record.headline, record.summary].filter((value): value is string => typeof value === 'string').join(' ')
  }
  return ''
}

function buildSourceReferences(snapshot: Awaited<ReturnType<typeof getRuntimeDataSnapshot>>): string[] {
  return [
    snapshot.score ? `score:${readString(snapshot.score, 'id')}` : null,
    snapshot.previousScore ? `score:${readString(snapshot.previousScore, 'id')}` : null,
    snapshot.signal ? `signal:${readString(snapshot.signal, 'id')}` : null,
    snapshot.brief ? `daily_brief:${snapshot.brief.id}` : null,
    snapshot.factors ? `score_factors:${readString(snapshot.factors, 'id')}` : null,
    'safety_policy:phase4a.v1',
  ].filter((value): value is string => Boolean(value && !value.endsWith(':')))
}

function buildPriorities(snapshot: Awaited<ReturnType<typeof getRuntimeDataSnapshot>>): Array<Record<string, unknown>> {
  if (snapshot.brief?.focus_items && Array.isArray(snapshot.brief.focus_items)) {
    return snapshot.brief.focus_items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).slice(0, 3).map((item) => ({
      title: readString(item, 'title', 'Keep today simple'),
      description: readString(item, 'description', 'Focus on one steady action.'),
      category: readString(item, 'category', 'baseline'),
    }))
  }
  return snapshot.insights.slice(0, 3).map((insight) => ({
    title: readString(insight, 'title', 'Keep today simple'),
    description: readString(insight, 'recommendation', readString(insight, 'description', 'Focus on one steady action.')),
    category: readString(insight, 'category', 'baseline'),
  }))
}

function buildExplanationPaths(snapshot: Awaited<ReturnType<typeof getRuntimeDataSnapshot>>): Array<Record<string, unknown>> {
  const factors = snapshot.factors ?? {}
  return ['sleep_score', 'stress_score', 'recovery_score', 'activity_score', 'nutrition_score'].map((key) => ({
    factor: key.replace('_score', ''),
    value: readNumber(factors, key),
    statement: `${key.replace('_score', '')} contributed to the deterministic Nuraa Score.`,
    sourceReference: snapshot.factors ? `score_factors:${readString(snapshot.factors, 'id')}` : 'deterministic:nuraa',
  }))
}

function buildConfidenceNotes(snapshot: Awaited<ReturnType<typeof getRuntimeDataSnapshot>>): string[] {
  const confidence = readNumber(snapshot.score, 'confidence')
  if (confidence === null || confidence < 45) return ['Nuraa has limited confidence because more check-ins are needed.']
  return [`Nuraa confidence is ${confidence} based on current deterministic signals.`]
}

function buildMissingInformation(snapshot: Awaited<ReturnType<typeof getRuntimeDataSnapshot>>): string[] {
  const missing: string[] = []
  if (!snapshot.score) missing.push('Current score is not available yet.')
  if (!snapshot.brief) missing.push('Daily brief is not available yet.')
  if (!snapshot.signal) missing.push('Latest health signal is not available yet.')
  return missing
}

function readString(value: unknown, key: string, fallback = ''): string {
  if (!value || typeof value !== 'object') return fallback
  const item = (value as Record<string, unknown>)[key]
  return typeof item === 'string' ? item : fallback
}

function readNumber(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const item = (value as Record<string, unknown>)[key]
  return typeof item === 'number' ? item : null
}

function parseUuidSource(reference: string): string | null {
  const id = reference.split(':')[1]
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null
}
