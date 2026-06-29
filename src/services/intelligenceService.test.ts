import { describe, expect, it } from 'vitest'
import { buildIntelligenceFromBundle } from './intelligenceService'
import type { DailyCheckin, Profile } from '@/types/database'

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

const checkin: DailyCheckin = {
  id: 'checkin-1',
  user_id: 'user-1',
  checkin_date: '2026-06-27',
  mood: 'good',
  energy_level: 5,
  stress_level: 2,
  sleep_quality: 5,
  sleep_hours: 7.5,
  notes: JSON.stringify({ body_soreness: 2, motivation_level: 4 }),
  created_at: '2026-06-27T00:00:00.000Z',
}

describe('buildIntelligenceFromBundle', () => {
  it('builds signal, score, rules, and brief for a check-in', () => {
    const result = buildIntelligenceFromBundle({ profile, healthProfile: null, goals: [], preferences: null, permissions: null }, checkin)

    expect(result.signal.userId).toBe('user-1')
    expect(result.score.totalScore).toBeGreaterThan(0)
    expect(result.brief.headline).toBeTruthy()
    expect(result.insights.length).toBeGreaterThan(0)
  })
})
