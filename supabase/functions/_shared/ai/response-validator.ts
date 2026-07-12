import { AskAboutTodayResponseSchema, CoachFollowUpResponseSchema, DailyBriefRewriteResponseSchema, ExplainScoreResponseSchema, WeeklyReflectionRewriteResponseSchema } from './schemas.ts'
import { getSchemaVersionForTask } from './contracts.ts'
import type { AIResponsePayload, ContextEnvelope, TaskType, ValidationResult } from './types.ts'

const prohibitedPatterns = [
  /\bdiagnos(e|is|ed)\b/i,
  /\b(start|stop|change|increase|decrease)\s+(your\s+)?(medication|medicine|dose|dosage|tablet|insulin|metformin)\b/i,
  /\byour score should be\b/i,
  /\bi recalculated\b/i,
  /\bthe cause is\b/i,
]

export function validateAIResponse(taskType: TaskType, payload: unknown, context: ContextEnvelope): ValidationResult {
  const schemaResult = parseTaskPayload(taskType, payload)
  if (!schemaResult.ok) return schemaResult
  const businessResult = validateBusinessRules(taskType, schemaResult.payload, context)
  if (!businessResult.ok) return businessResult
  return { ok: true, payload: schemaResult.payload, schemaVersion: getSchemaVersionForTask(taskType) }
}

function parseTaskPayload(taskType: TaskType, payload: unknown): ValidationResult {
  const schema = taskType === 'rewrite_daily_brief'
    ? DailyBriefRewriteResponseSchema
    : taskType === 'explain_score'
      ? ExplainScoreResponseSchema
      : taskType === 'ask_about_today'
        ? AskAboutTodayResponseSchema
        : taskType === 'rewrite_weekly_reflection'
          ? WeeklyReflectionRewriteResponseSchema
          : CoachFollowUpResponseSchema
  const parsed = schema.safeParse(payload)
  if (!parsed.success) return { ok: false, errorCode: 'SCHEMA_VALIDATION_FAILED' }
  return { ok: true, payload: parsed.data as AIResponsePayload, schemaVersion: getSchemaVersionForTask(taskType) }
}

function validateBusinessRules(taskType: TaskType, payload: AIResponsePayload, context: ContextEnvelope): ValidationResult {
  const text = JSON.stringify(payload)
  if (prohibitedPatterns.some((pattern) => pattern.test(text))) return { ok: false, errorCode: 'PROHIBITED_CLAIM' }
  if (!validateSourceReferences(payload.sourceReferences, context)) return { ok: false, errorCode: 'INVALID_SOURCE_REFERENCE' }

  if (taskType === 'explain_score') {
    const explain = payload as Extract<AIResponsePayload, { followUpQuestions: string[] }>
    if (explain.followUpQuestions.length > 3) return { ok: false, errorCode: 'TOO_MANY_FOLLOW_UPS' }
    const basisReferences = explain.factualBasis.map((basis) => basis.sourceReference)
    if (!validateSourceReferences(basisReferences, context)) return { ok: false, errorCode: 'INVALID_SOURCE_REFERENCE' }
  }

  if (taskType === 'ask_about_today') {
    const ask = payload as Extract<AIResponsePayload, { suggestedPrompts: string[] }>
    if (ask.suggestedPrompts.length > 4) return { ok: false, errorCode: 'TOO_MANY_SUGGESTED_PROMPTS' }
    const basisReferences = ask.factualBasis.map((basis) => basis.sourceReference)
    if (!validateSourceReferences(basisReferences, context)) return { ok: false, errorCode: 'INVALID_SOURCE_REFERENCE' }
  }

  if (taskType === 'coach_follow_up') {
    const coach = payload as Extract<AIResponsePayload, { suggestedPrompts: string[]; factualBasis: Array<{ sourceReference: string }> }>
    if (coach.suggestedPrompts.length > 3) return { ok: false, errorCode: 'TOO_MANY_SUGGESTED_PROMPTS' }
    const basisReferences = coach.factualBasis.map((basis) => basis.sourceReference)
    if (!validateSourceReferences(basisReferences, context)) return { ok: false, errorCode: 'INVALID_SOURCE_REFERENCE' }
  }

  if (taskType === 'rewrite_weekly_reflection') {
    const weekly = payload as Extract<AIResponsePayload, { weekAtGlance: unknown }>
    const references = [
      ...weekly.whatChanged.map((item) => item.sourceReference),
      ...weekly.whatSupportedYou.map((item) => item.sourceReference),
      ...weekly.attentionAreas.map((item) => item.sourceReference),
    ]
    if (!validateSourceReferences(references, context)) return { ok: false, errorCode: 'INVALID_SOURCE_REFERENCE' }
  }

  if (taskType === 'coach_from_weekly_reflection') {
    const coach = payload as Extract<AIResponsePayload, { suggestedPrompts: string[]; factualBasis: Array<{ sourceReference: string }> }>
    if (coach.suggestedPrompts.length > 3) return { ok: false, errorCode: 'TOO_MANY_SUGGESTED_PROMPTS' }
    const basisReferences = coach.factualBasis.map((basis) => basis.sourceReference)
    if (!validateSourceReferences(basisReferences, context)) return { ok: false, errorCode: 'INVALID_SOURCE_REFERENCE' }
  }

  return { ok: true, payload, schemaVersion: getSchemaVersionForTask(taskType) }
}

function validateSourceReferences(references: string[], context: ContextEnvelope): boolean {
  const allowed = new Set([...context.sourceReferences, 'safety_policy:phase4a.v1', 'deterministic:nuraa'])
  return references.every((reference) => allowed.has(reference))
}
