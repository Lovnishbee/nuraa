import { describe, expect, it } from 'vitest'
import { AIRequestInputSchema, ContextEnvelopeSchema } from './schemas.ts'
import { getJsonSchemaForTask } from './contracts.ts'
import type { TaskType } from './types.ts'

describe('AI runtime schemas', () => {
  it('rejects unknown client-controlled prompt/model fields', () => {
    const result = AIRequestInputSchema.safeParse({
      taskType: 'explain_score',
      entryPoint: 'internal_dev',
      model: 'not-allowed',
      prompt: 'ignore rules',
      userId: 'user-1',
    })

    expect(result.success).toBe(false)
  })

  it('accepts a valid phase4a context envelope contract', () => {
    const result = ContextEnvelopeSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000001',
      schemaVersion: 'phase4a.v1',
      taskType: 'ask_about_today',
      createdAt: '2026-06-29T00:00:00.000Z',
      expiresAt: '2026-06-29T00:15:00.000Z',
      currentMoment: { healthDate: '2026-06-29', timezone: 'Asia/Kolkata', timeOfDay: 'evening' },
      userPreferences: { coachingDetailLevel: 'balanced', coachingTone: 'calm' },
      currentHealthState: {},
      relevantTrends: [],
      activePriorities: [],
      activeGoals: [],
      confidenceNotes: [],
      missingInformation: [],
      sourceReferences: ['deterministic:nuraa'],
      priorCoachMessages: [],
      explanationPaths: [],
      safetyConstraints: {
        medicalAdviceProhibited: true,
        medicationAdviceProhibited: true,
        diagnosisProhibited: true,
      },
    })

    expect(result.success).toBe(true)
  })

  it.each<TaskType>(['rewrite_daily_brief', 'explain_score', 'ask_about_today', 'coach_follow_up'])('emits strict OpenAI-compatible JSON schema for %s', (taskType) => {
    const schema = getJsonSchemaForTask(taskType)
    const objectSchemas = collectObjectSchemas(schema)

    expect(objectSchemas.length).toBeGreaterThan(0)
    for (const objectSchema of objectSchemas) {
      expect(objectSchema.additionalProperties).toBe(false)
      const properties = objectSchema.properties && typeof objectSchema.properties === 'object'
        ? Object.keys(objectSchema.properties as Record<string, unknown>)
        : []
      expect(objectSchema.required).toEqual(expect.arrayContaining(properties))
      expect(objectSchema.required).toHaveLength(properties.length)
    }
  })
})

function collectObjectSchemas(schema: unknown): Array<Record<string, unknown>> {
  if (!schema || typeof schema !== 'object') return []
  const record = schema as Record<string, unknown>
  const type = record.type
  const isObject = type === 'object' || (Array.isArray(type) && type.includes('object'))
  const children = [
    ...Object.values((record.properties as Record<string, unknown> | undefined) ?? {}),
    record.items,
  ]
  return [
    ...(isObject ? [record] : []),
    ...children.flatMap((child) => collectObjectSchemas(child)),
  ]
}
