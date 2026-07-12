import { describe, expect, it } from 'vitest'
import { buildDeterministicWeeklyReflectionPayload, buildWeeklyReflectionMetrics, buildWeeklyWindow } from './weekly-metrics.ts'
import { validateWeeklyReflectionPayload } from './validator.ts'
import type { WeeklyReflectionSnapshot } from './types.ts'

describe('Phase V-C weekly reflection metrics', () => {
  it('uses the user local rolling 7-day window', () => {
    expect(buildWeeklyWindow('Asia/Kolkata', new Date('2026-07-12T20:30:00.000Z'))).toEqual({
      weekStartDate: '2026-07-07',
      weekEndDate: '2026-07-13',
      previousWeekStartDate: '2026-06-30',
      previousWeekEndDate: '2026-07-06',
    })
  })

  it('calculates weekly summary metrics and one next-week focus', () => {
    const metrics = buildWeeklyReflectionMetrics(snapshot())

    expect(metrics.averageScore).toBe(73)
    expect(metrics.previousAverageScore).toBe(66)
    expect(metrics.scoreDirection).toBe('up')
    expect(metrics.strongestFactor).toBe('sleep')
    expect(metrics.weakestFactor).toBe('stress')
    expect(metrics.primaryNextWeekFocus.title).toBe('Create one reset window')
    expect(metrics.checkinCoverage).toBeGreaterThan(50)
  })

  it('creates a schema-valid deterministic payload with safe references', () => {
    const metrics = buildWeeklyReflectionMetrics(snapshot())
    const payload = buildDeterministicWeeklyReflectionPayload(metrics)
    const validation = validateWeeklyReflectionPayload(payload, metrics.sourceReferences.map((reference) => reference.sourceReference))

    expect(validation.ok).toBe(true)
    expect(payload.nextWeekFocus.title).toBeTruthy()
    expect(payload.suggestedCoachPrompts.length).toBeLessThanOrEqual(3)
  })

  it('sanitizes historical insight copy before weekly validation', () => {
    const unsafeSnapshot = snapshot()
    unsafeSnapshot.insightEvents = [{
      id: '00000000-0000-4000-8000-000000000502',
      event_date: '2026-07-13',
      title: 'You have a very long pattern '.repeat(20),
      description: 'This caused a concern and you need treatment. '.repeat(20),
      recommendation: 'Keep the next step simple.',
    }]
    const metrics = buildWeeklyReflectionMetrics(unsafeSnapshot)
    const payload = buildDeterministicWeeklyReflectionPayload(metrics)
    const validation = validateWeeklyReflectionPayload(payload, metrics.sourceReferences.map((reference) => reference.sourceReference))

    expect(validation.ok).toBe(true)
    expect(payload.whatChanged[0]?.title).toBe('Weekly pattern')
    expect(payload.whatChanged[0]?.explanation).toBe('Nuraa noticed this from deterministic weekly signals.')
  })

  it('rejects unsafe weekly reflection claims', () => {
    const metrics = buildWeeklyReflectionMetrics(snapshot())
    const payload = buildDeterministicWeeklyReflectionPayload(metrics)
    const validation = validateWeeklyReflectionPayload({ ...payload, headline: 'You are at risk this week' }, payload.sourceReferences)

    expect(validation).toEqual({ ok: false, errorCode: 'WEEKLY_PROHIBITED_CLAIM' })
  })

  it('rejects weekly reflection source references that were not approved by deterministic metrics', () => {
    const metrics = buildWeeklyReflectionMetrics(snapshot())
    const payload = buildDeterministicWeeklyReflectionPayload(metrics)
    const validation = validateWeeklyReflectionPayload({
      ...payload,
      whatChanged: [{ title: 'Unapproved source', explanation: 'This should not pass validation.', sourceReference: 'raw_prompt:unsafe' }],
    }, metrics.sourceReferences.map((reference) => reference.sourceReference))

    expect(validation).toEqual({ ok: false, errorCode: 'WEEKLY_INVALID_SOURCE_REFERENCE' })
  })
})

function snapshot(): WeeklyReflectionSnapshot {
  const userId = '00000000-0000-4000-8000-000000000001'
  return {
    userId,
    timezone: 'Asia/Kolkata',
    healthDate: '2026-07-13',
    weekStartDate: '2026-07-07',
    weekEndDate: '2026-07-13',
    previousWeekStartDate: '2026-06-30',
    previousWeekEndDate: '2026-07-06',
    nowIso: '2026-07-12T20:30:00.000Z',
    scores: [
      row('2026-07-13', 76), row('2026-07-12', 72), row('2026-07-11', 70), row('2026-06-30', 66),
    ],
    scoreFactors: [
      factors('2026-07-13', 84, 55, 72),
      factors('2026-07-12', 80, 60, 72),
      factors('2026-07-11', 82, 58, 68),
      factors('2026-06-30', 72, 50, 65),
    ],
    healthSignals: [{ id: '00000000-0000-4000-8000-000000000201', signal_date: '2026-07-13', user_id: userId }],
    dailyBriefs: [{ id: '00000000-0000-4000-8000-000000000301', brief_date: '2026-07-13', user_id: userId }],
    insightEvents: [{ id: '00000000-0000-4000-8000-000000000501', event_date: '2026-07-13', title: 'Stress was elevated', description: 'Your stress signal was the lowest weekly factor.', recommendation: 'Create a reset window.' }],
    goals: [{ id: '00000000-0000-4000-8000-000000000601', goal_label: 'Improve Energy' }],
    cardFeedback: [],
    checkins: ['2026-07-13', '2026-07-12', '2026-07-11', '2026-07-10'].map((date) => ({ id: crypto.randomUUID(), checkin_date: date })),
  }
}

function row(date: string, score: number) {
  return { id: crypto.randomUUID(), score_date: date, total_score: score, readiness_category: score >= 70 ? 'Ready' : 'Steady' }
}

function factors(date: string, sleep: number, stress: number, recovery: number) {
  return { id: crypto.randomUUID(), score_date: date, sleep_score: sleep, stress_score: stress, recovery_score: recovery, activity_score: 70, nutrition_score: 70, hydration_score: 68, confidence: 70 }
}
