import { describe, expect, it } from 'vitest'
import { buildCheckInNotes, parseCheckInNotes } from './checkins'

describe('check-in notes serialization', () => {
  it('stores soreness, motivation, and reflection inside existing daily_checkins notes', () => {
    const notes = buildCheckInNotes({ soreness: 2, motivation: 4, reflection: 'Felt steady today.' })

    expect(parseCheckInNotes(notes)).toEqual({
      body_soreness: 2,
      motivation_level: 4,
      reflection: 'Felt steady today.',
    })
  })

  it('falls back gracefully for plain text legacy notes', () => {
    expect(parseCheckInNotes('legacy note')).toEqual({
      body_soreness: null,
      motivation_level: null,
      reflection: 'legacy note',
    })
  })
})
