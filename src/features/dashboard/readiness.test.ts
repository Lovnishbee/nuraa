import { describe, expect, it } from 'vitest'
import { getDashboardReadiness } from './readiness'

describe('getDashboardReadiness', () => {
  it('returns an intentional empty baseline state before the first check-in', () => {
    expect(getDashboardReadiness(null, null)).toMatchObject({
      score: 0,
      category: 'Setting up your readiness baseline',
      hasBaseline: false,
      checkinCountLabel: 'Ready after a few check-ins',
    })
  })

  it('starts a deterministic baseline after a check-in even without a stored score', () => {
    const view = getDashboardReadiness(null, {
      id: 'checkin-1',
      user_id: 'user-1',
      checkin_date: '2026-06-27',
      mood: 'good',
      energy_level: 4,
      stress_level: 2,
      sleep_quality: 4,
      sleep_hours: 7,
      notes: null,
      created_at: '2026-06-27T00:00:00.000Z',
    }, 1)

    expect(view.category).toBe('Baseline started')
    expect(view.score).toBeGreaterThan(0)
    expect(view.checkinCountLabel).toBe('1 check-in recorded')
  })
})
