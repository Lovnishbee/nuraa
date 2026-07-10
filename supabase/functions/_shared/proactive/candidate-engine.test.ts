import { describe, expect, it } from 'vitest'
import { calculateConfidence, labelConfidence } from './confidence.ts'
import { applyFatiguePolicy } from './fatigue-policy.ts'
import { rankCandidates } from './ranking.ts'
import { generateProactiveCandidates } from './candidate-engine.ts'
import { PROACTIVE_ENGINE_VERSION, type GeneratedCandidate, type ProactiveSnapshot } from './types.ts'

const userId = '00000000-0000-4000-8000-000000000001'

describe('Phase V-A candidate generation', () => {
  it('generates a sleep stability observation', () => {
    const result = generateProactiveCandidates(snapshot({
      healthSignals: days([81, 80, 79, 78], 'sleep_score').map((signal) => ({ ...signal, sleep_quality: 4 })),
      scoreFactors: days([81, 80, 79, 78], 'sleep_score'),
    }))

    expect(result.candidates.some((candidate) => candidate.candidate_type === 'observation' && candidate.category === 'sleep')).toBe(true)
  })

  it('generates a sleep decline attention candidate', () => {
    const result = generateProactiveCandidates(snapshot({
      scoreFactors: [
        ...days([45, 52, 67, 82], 'sleep_score'),
        ...olderDays([82, 84, 85, 83], 'sleep_score'),
      ],
      healthSignals: days([45, 52, 67], 'sleep_score').map((signal) => ({ ...signal, sleep_quality: 2 })),
    }))

    expect(result.candidates.some((candidate) => candidate.candidate_type === 'attention' && candidate.category === 'sleep')).toBe(true)
  })

  it('generates a stress-energy opportunity without causation language', () => {
    const result = generateProactiveCandidates(snapshot({
      healthSignals: baseSignals().map((signal, index) => ({ ...signal, stress_level: index < 2 ? 5 : 3, energy_level: index < 2 ? 2 : 4 })),
    }))
    const candidate = result.candidates.find((item) => item.category === 'stress' && item.deterministic_title.includes('Stress and lower energy'))

    expect(candidate?.deterministic_summary).toContain('appears linked')
    expect(candidate?.deterministic_summary).not.toMatch(/caused|causes/i)
  })

  it('generates recovery, hydration, activity, goal, readiness, data-gap, and evening-stress candidates', () => {
    const result = generateProactiveCandidates(snapshot({
      scores: [
        score('2026-07-09', 82, 'Ready', 80),
        score('2026-07-08', 67, 'Steady', 80),
      ],
      scoreFactors: [
        factor('2026-07-09', { recovery_score: 42, activity_score: 82, hydration_score: 82, sleep_score: 75, nutrition_score: 72 }),
        factor('2026-07-08', { recovery_score: 48, activity_score: 80, hydration_score: 80, sleep_score: 73, nutrition_score: 70 }),
        factor('2026-07-07', { recovery_score: 50, activity_score: 78, hydration_score: 78, sleep_score: 71, nutrition_score: 70 }),
        ...olderDays([61, 62, 63], 'recovery_score').map((row) => ({ ...row, activity_score: 60, hydration_score: 55 })),
      ],
      healthSignals: baseSignals().map((signal, index) => ({ ...signal, stress_level: index < 3 ? 5 : 3, energy_level: index < 3 ? 2 : 4, sleep_quality: index < 3 ? 2 : 4 })),
      dailyCheckins: [
        checkin('2026-07-09', '2026-07-09T14:30:00.000Z'),
        checkin('2026-07-08', '2026-07-08T14:30:00.000Z'),
        checkin('2026-07-07', '2026-07-07T14:30:00.000Z'),
        checkin('2026-07-06', '2026-07-06T14:30:00.000Z'),
      ],
      goals: [{ id: 'goal-1', user_id: userId, goal_type: 'energy', goal_label: 'Improve Energy', priority: 1, status: 'active' }],
    }))

    expect(result.candidates.some((candidate) => candidate.category === 'recovery')).toBe(true)
    expect(result.candidates.some((candidate) => candidate.category === 'hydration')).toBe(true)
    expect(result.candidates.some((candidate) => candidate.category === 'activity')).toBe(true)
    expect(result.candidates.some((candidate) => candidate.category === 'goal_progress')).toBe(true)
    expect(result.candidates.some((candidate) => candidate.category === 'readiness')).toBe(true)
    expect(result.candidates.some((candidate) => candidate.category === 'stress' && candidate.deterministic_title.includes('Evening'))).toBe(true)
  })

  it('generates a gentle data gap when confidence is low', () => {
    const result = generateProactiveCandidates(snapshot({
      scores: [score('2026-07-09', 70, 'Ready', 30)],
      healthSignals: [],
      scoreFactors: [],
    }))

    expect(result.candidates.some((candidate) => candidate.candidate_type === 'data_gap' && candidate.category === 'data_gap')).toBe(true)
  })

  it('keeps raw check-in notes out of evidence', () => {
    const result = generateProactiveCandidates(snapshot({
      healthSignals: baseSignals().map((signal, index) => ({ ...signal, stress_level: index < 2 ? 5 : 3, energy_level: index < 2 ? 2 : 4 })),
    }))

    expect(JSON.stringify(result.candidates)).not.toContain('reflection')
    expect(JSON.stringify(result.candidates)).not.toContain('notes')
  })
})

describe('Phase V-A confidence, ranking, and fatigue', () => {
  it('labels confidence thresholds correctly', () => {
    expect(labelConfidence(95)).toBe('high')
    expect(labelConfidence(70)).toBe('moderate')
    expect(labelConfidence(40)).toBe('low')
    expect(labelConfidence(20)).toBe('insufficient')
  })

  it('calculates confidence from coverage, consistency, recency, quality, and contradiction penalty', () => {
    const confidence = calculateConfidence({ validDataPoints: 5, expectedDataPoints: 7, consistency: 0.8, latestAgeDays: 1, sourceQuality: 1, contradictions: 0.2 })

    expect(confidence.score).toBe(71)
    expect(confidence.label).toBe('moderate')
    expect(confidence.contradictionPenalty).toBe(2)
  })

  it('ranks actionable and goal-relevant candidates above weaker candidates', () => {
    const base = generatedCandidate({ category: 'sleep', confidence_score: 85, confidence_label: 'high', recommended_action: { title: 'Sleep', detail: null } })
    const weak = generatedCandidate({ category: 'hydration', confidence_score: 40, confidence_label: 'low', recommended_action: null })
    const ranked = rankCandidates([weak, base], snapshot())

    expect(ranked[0].category).toBe('sleep')
    expect(ranked[0].ranking_score).toBeGreaterThan(ranked[1].ranking_score ?? 0)
  })

  it('applies daily caps and repetition suppression', () => {
    const repeated = generatedCandidate({ theme_key: 'attention:sleep:repeated', candidate_type: 'attention', category: 'sleep' })
    const firstAttention = generatedCandidate({ theme_key: 'attention:stress:first', candidate_type: 'attention', category: 'stress' })
    const secondAttention = generatedCandidate({ theme_key: 'attention:recovery:second', candidate_type: 'attention', category: 'recovery' })
    const currentSnapshot = snapshot({
      existingCandidates: [{ ...repeated, status: 'approved', created_at: '2026-07-09T08:00:00.000Z' }],
    })
    const results = applyFatiguePolicy([repeated, firstAttention, secondAttention], currentSnapshot)

    expect(results.find((candidate) => candidate.theme_key === repeated.theme_key)?.suppression_reason).toBe('same_theme_72h')
    expect(results.filter((candidate) => candidate.status === 'approved' && candidate.candidate_type === 'attention')).toHaveLength(1)
    expect(results.find((candidate) => candidate.theme_key === secondAttention.theme_key)?.suppression_reason).toBe('attention_daily_cap')
  })
})

function snapshot(overrides: Partial<ProactiveSnapshot> = {}): ProactiveSnapshot {
  return {
    userId,
    timezone: 'Asia/Kolkata',
    healthDate: '2026-07-09',
    windowStart: '2026-07-03',
    windowEnd: '2026-07-09',
    nowIso: '2026-07-09T15:00:00.000Z',
    scores: [score('2026-07-09', 78, 'Ready', 75), score('2026-07-08', 74, 'Ready', 75)],
    scoreFactors: [
      factor('2026-07-09', {}),
      factor('2026-07-08', {}),
      factor('2026-07-07', {}),
      factor('2026-07-06', {}),
    ],
    healthSignals: baseSignals(),
    dailyCheckins: [],
    dailyBriefs: [{ id: 'brief-1', user_id: userId, brief_date: '2026-07-09', headline: 'Steady day', tone: 'supportive' }],
    insightEvents: [],
    goals: [{ id: 'goal-1', user_id: userId, goal_type: 'sleep', goal_label: 'Better Sleep', priority: 1, status: 'active' }],
    userPreferences: null,
    coachFeedback: [],
    existingCandidates: [],
    preferences: { user_id: userId, proactive_guidance_enabled: true, max_cards_per_day: 3, muted_categories: [], reduced_categories: [] },
    ...overrides,
  }
}

function baseSignals() {
  return days([76, 74, 73, 72], 'sleep_score').map((signal, index) => ({
    ...signal,
    sleep_quality: 4,
    stress_level: index < 2 ? 4 : 3,
    energy_level: index < 2 ? 2 : 4,
    overall_signal_confidence: 75,
  }))
}

function score(date: string, total: number, category: string, confidence: number) {
  return { id: `score-${date}`, user_id: userId, score_date: date, total_score: total, readiness_category: category, confidence, primary_driver: 'sleep', limiting_factor: 'recovery' }
}

function factor(date: string, overrides: Record<string, number | null>) {
  return {
    id: `factor-${date}`,
    user_id: userId,
    score_date: date,
    sleep_score: 75,
    stress_score: 72,
    recovery_score: 75,
    activity_score: 70,
    nutrition_score: 70,
    hydration_score: 70,
    confidence: 75,
    ...overrides,
  }
}

function days(values: number[], key: string) {
  const dates = ['2026-07-09', '2026-07-08', '2026-07-07', '2026-07-06', '2026-07-05', '2026-07-04', '2026-07-03']
  return values.map((value, index) => ({
    ...factor(dates[index], {}),
    id: `${key}-${dates[index]}`,
    signal_date: dates[index],
    sleep_hours: null,
    sleep_quality: null,
    stress_level: null,
    energy_level: null,
    soreness_level: null,
    motivation_level: null,
    mood: null,
    activity_score: null,
    nutrition_score: null,
    hydration_score: null,
    recovery_score: null,
    stress_score: null,
    overall_signal_confidence: null,
    [key]: value,
  }))
}

function olderDays(values: number[], key: string) {
  const dates = ['2026-07-02', '2026-07-01', '2026-06-30', '2026-06-29']
  return values.map((value, index) => ({ ...factor(dates[index], {}), id: `${key}-${dates[index]}`, signal_date: dates[index], [key]: value }))
}

function checkin(date: string, createdAt: string) {
  return { id: `checkin-${date}`, user_id: userId, checkin_date: date, stress_level: 5, sleep_quality: 2, energy_level: 2, created_at: createdAt }
}

function generatedCandidate(overrides: Partial<GeneratedCandidate> = {}): GeneratedCandidate {
  return {
    user_id: userId,
    health_date: '2026-07-09',
    theme_key: 'observation:sleep:base',
    candidate_hash: 'hash',
    data_window_start: '2026-07-03',
    data_window_end: '2026-07-09',
    candidate_type: 'observation',
    category: 'sleep',
    severity: 'low',
    confidence_score: 80,
    confidence_label: 'high',
    deterministic_title: 'Base title',
    deterministic_summary: 'Base summary',
    recommended_action: { title: 'Action', detail: null },
    evidence_json: { summary: 'Base summary', evidence: [], confidence: 'high', limitations: [] },
    source_references: [],
    ranking_score: 80,
    status: 'candidate',
    eligible_from: '2026-07-09T15:00:00.000Z',
    expires_at: '2026-07-11T03:00:00.000Z',
    suppression_reason: null,
    created_by_engine_version: PROACTIVE_ENGINE_VERSION,
    confidenceBreakdown: {
      score: 80,
      label: 'high',
      dataCoverageScore: 30,
      signalConsistencyScore: 20,
      recencyScore: 20,
      sourceQualityScore: 10,
      contradictionPenalty: 0,
      limitations: [],
    },
    ...overrides,
  }
}
