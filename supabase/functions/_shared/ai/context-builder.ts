import { getLocalISODate, getTimeOfDay, addMinutes } from './date.ts'
import { flagForTask } from './feature-flags.ts'
import { stableJsonHash } from './hash.ts'
import { createContextEnvelopeMetadata, createContextItems, createContextRequest } from './repositories/ai-runtime.repository.ts'
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
  const preferences = await getUserCoachingPreferences(options.client, options.userId)
  const timezone = snapshot.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const expiresAt = addMinutes(now, 15).toISOString()
  const sourceReferences = buildSourceReferences(snapshot)
  const priorities = buildPriorities(snapshot)
  const envelope: ContextEnvelope = {
    id: crypto.randomUUID(),
    schemaVersion: 'phase4a.v1',
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
    relevantTrends: [snapshot.score, snapshot.previousScore].filter(Boolean).map((score) => ({
      date: readString(score, 'score_date'),
      score: readNumber(score, 'total_score'),
      category: readString(score, 'readiness_category'),
    })),
    activePriorities: priorities.slice(0, 3),
    activeGoals: snapshot.goals.slice(0, 3).map((goal) => ({
      id: readString(goal, 'id'),
      label: readString(goal, 'goal_label'),
      priority: readNumber(goal, 'priority'),
    })),
    confidenceNotes: buildConfidenceNotes(snapshot),
    missingInformation: buildMissingInformation(snapshot),
    sourceReferences,
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
