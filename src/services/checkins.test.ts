import { describe, expect, it } from 'vitest'
import { buildCheckInNotes, parseCheckInNotes } from './checkins'

describe('check-in notes serialization', () => {
  it('stores soreness, motivation, hydration, and reflection inside existing daily_checkins notes', () => {
    const notes = buildCheckInNotes({ soreness: 2, motivation: 4, hydrationLitres: 2.2, reflection: 'Felt steady today.' })

    expect(parseCheckInNotes(notes)).toEqual({
      body_soreness: 2,
      motivation_level: 4,
      hydration_litres: 2.2,
      reflection: 'Felt steady today.',
    })
  })

  it('falls back gracefully for plain text legacy notes', () => {
    expect(parseCheckInNotes('legacy note')).toEqual({
      body_soreness: null,
      motivation_level: null,
      hydration_litres: null,
      reflection: 'legacy note',
    })
  })
})
