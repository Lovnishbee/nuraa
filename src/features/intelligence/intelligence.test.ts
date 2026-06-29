import { describe, expect, it } from 'vitest'
import { buildHealthSignal } from './signal-engine'
import { calculateNuraaScore } from './score-engine'
import { runInsightRules } from './rules-engine'
import { generateDailyBrief } from './brief-engine'
import type { DailyCheckin, HealthProfile, Profile, UserPreferences } from '@/types/database'

const profile: Profile = {
  id: 'user-1',
  full_name: 'Test User',
  email: 'test@nuraa.health',
  phone: null,
  avatar_url: null,
  date_of_birth: null,
  age: 34,
  gender: 'female',
  location_city: null,
  location_country: null,
  timezone: 'Asia/Kolkata',
  onboarding_completed: true,
  created_at: '2026-06-27T00:00:00.000Z',
  updated_at: '2026-06-27T00:00:00.000Z',
}

const healthProfile: HealthProfile = {
  id: 'health-1',
  user_id: 'user-1',
  height_cm: 165,
  weight_kg: 70,
  target_weight_kg: null,
  activity_level: 'moderate',
  fitness_level: null,
  medical_conditions: [],
  injuries: [],
  allergies: [],
  dietary_restrictions: [],
  created_at: '2026-06-27T00:00:00.000Z',
  updated_at: '2026-06-27T00:00:00.000Z',
}

const preferences: UserPreferences = {
  id: 'pref-1',
  user_id: 'user-1',
  diet_preference: 'omnivore',
  cuisine_preferences: [],
  disliked_foods: [],
  preferred_workout_types: [],
  available_equipment: [],
  preferred_workout_time: null,
  work_type: null,
  work_schedule: null,
  commute_minutes: null,
  travel_frequency: null,
  notification_preference: null,
  created_at: '2026-06-27T00:00:00.000Z',
  updated_at: '2026-06-27T00:00:00.000Z',
}

function checkin(overrides: Partial<DailyCheckin>): DailyCheckin {
  return {
    id: 'checkin-1',
    user_id: 'user-1',
    checkin_date: '2026-06-27',
    mood: 'good',
    energy_level: 4,
    stress_level: 2,
    sleep_quality: 4,
    sleep_hours: 7.5,
    notes: JSON.stringify({ body_soreness: 2, motivation_level: 4, reflection: null }),
    created_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  }
}

describe('Nuraa intelligence engines', () => {
  it('handles missing data with neutral scores and low confidence', () => {
    const signal = buildHealthSignal({ profile, healthProfile: null, goals: [], preferences: null, checkin: null })
    const score = calculateNuraaScore(signal)

    expect(signal.sleep.score).toBe(70)
    expect(signal.sleep.confidence).toBeLessThan(30)
    expect(score.totalScore).toBe(70)
    expect(score.confidence).toBeLessThan(30)
  })

  it('calculates score category, drivers, and recommendations from check-in data', () => {
    const signal = buildHealthSignal({ profile, healthProfile, goals: [], preferences, checkin: checkin({}) })
    const score = calculateNuraaScore(signal)

    expect(score.category).toMatch(/Ready|Peak|Steady/)
    expect(score.primaryDriver).toBeTruthy()
    expect(score.limitingFactor).toBeTruthy()
    expect(score.recommendations.length).toBeGreaterThan(0)
  })

  it('triggers caution rules without diagnostic language', () => {
    const signal = buildHealthSignal({ profile, healthProfile, goals: [], preferences, checkin: checkin({ sleep_hours: 5, sleep_quality: 2, stress_level: 5 }) })
    const rules = runInsightRules(signal)
    const combinedCopy = rules.map((rule) => `${rule.title} ${rule.description} ${rule.recommendation}`).join(' ')

    expect(rules.some((rule) => rule.ruleId === 'poor_sleep')).toBe(true)
    expect(rules.some((rule) => rule.ruleId === 'high_stress')).toBe(true)
    expect(combinedCopy).not.toMatch(/you have|this indicates|diagnos/i)
  })

  it('triggers every specified deterministic rule from the relevant signals', () => {
    const poorDay = buildHealthSignal({
      profile,
      healthProfile,
      goals: [],
      preferences,
      checkin: checkin({
        energy_level: 1,
        sleep_hours: 4.5,
        sleep_quality: 1,
        stress_level: 5,
        notes: JSON.stringify({ body_soreness: 5, motivation_level: 1 }),
      }),
    })
    const goodDay = buildHealthSignal({ profile, healthProfile, goals: [], preferences, checkin: checkin({ energy_level: 5, sleep_quality: 5, sleep_hours: 8, stress_level: 1 }) })
    const poorRules = runInsightRules(poorDay).map((rule) => rule.ruleId)
    const goodRules = runInsightRules(goodDay).map((rule) => rule.ruleId)

    expect(poorRules).toEqual(expect.arrayContaining(['poor_sleep', 'high_stress', 'low_energy', 'high_soreness', 'low_motivation']))
    expect(goodRules).toContain('good_readiness')
  })

  it('generates performance, recovery, and baseline briefs', () => {
    const goodSignal = buildHealthSignal({ profile, healthProfile, goals: [], preferences, checkin: checkin({}) })
    const goodScore = calculateNuraaScore(goodSignal)
    expect(generateDailyBrief(goodSignal, goodScore, runInsightRules(goodSignal)).headline).toBe('You’re ready for a strong day.')

    const poorSleepSignal = buildHealthSignal({ profile, healthProfile, goals: [], preferences, checkin: checkin({ sleep_hours: 5, sleep_quality: 2 }) })
    const poorSleepScore = calculateNuraaScore(poorSleepSignal)
    expect(generateDailyBrief(poorSleepSignal, poorSleepScore, runInsightRules(poorSleepSignal)).tone).toBe('recovery')

    const limitedSignal = buildHealthSignal({ profile, healthProfile: null, goals: [], preferences: null, checkin: null })
    const limitedScore = calculateNuraaScore(limitedSignal)
    expect(generateDailyBrief(limitedSignal, limitedScore, runInsightRules(limitedSignal)).headline).toBe('Your baseline is taking shape.')
  })
})
