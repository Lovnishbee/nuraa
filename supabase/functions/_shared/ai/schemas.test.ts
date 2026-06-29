import { describe, expect, it } from 'vitest'
import { AIRequestInputSchema, ContextEnvelopeSchema } from './schemas.ts'

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
      explanationPaths: [],
      safetyConstraints: {
        medicalAdviceProhibited: true,
        medicationAdviceProhibited: true,
        diagnosisProhibited: true,
      },
    })

    expect(result.success).toBe(true)
  })
})
