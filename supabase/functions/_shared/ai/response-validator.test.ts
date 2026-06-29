import { describe, expect, it } from 'vitest'
import { validateAIResponse } from './response-validator.ts'
import type { ContextEnvelope } from './types.ts'

describe('ResponseValidator', () => {
  it('accepts a valid explain score response with known source refs', () => {
    const result = validateAIResponse('explain_score', {
      headline: 'Your score is steady.',
      summary: 'Your deterministic score is supported by sleep and recovery.',
      factualBasis: [{ label: 'Score', sourceReference: 'score:1' }],
      interpretations: [{ statement: 'Sleep is supporting today.', confidence: 'moderate' }],
      followUpQuestions: ['What should I focus on?'],
      sourceReferences: ['score:1'],
    }, context())

    expect(result.ok).toBe(true)
  })

  it('rejects diagnosis or medication-style claims', () => {
    const result = validateAIResponse('rewrite_daily_brief', {
      headline: 'Brief',
      summary: 'You should change your medication dose.',
      sourceReferences: ['score:1'],
    }, context())

    expect(result.ok).toBe(false)
  })

  it('rejects source references not present in context', () => {
    const result = validateAIResponse('rewrite_daily_brief', {
      headline: 'Brief',
      summary: 'Keep things steady.',
      sourceReferences: ['unknown:1'],
    }, context())

    expect(result.ok).toBe(false)
  })
})

function context(): ContextEnvelope {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    schemaVersion: 'phase4a.v1',
    taskType: 'explain_score',
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
    sourceReferences: ['score:1'],
    explanationPaths: [],
    safetyConstraints: { medicalAdviceProhibited: true, medicationAdviceProhibited: true, diagnosisProhibited: true },
  }
}
