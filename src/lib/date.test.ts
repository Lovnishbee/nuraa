import { describe, expect, it } from 'vitest'
import { getLocalISODate, getNowInTimezone } from './date'

describe('date helpers', () => {
  it('returns the calendar date in the requested timezone instead of UTC', () => {
    const utcEvening = new Date('2026-06-28T20:30:00.000Z')

    expect(getLocalISODate('Asia/Kolkata', utcEvening)).toBe('2026-06-29')
    expect(getLocalISODate('UTC', utcEvening)).toBe('2026-06-28')
  })

  it('returns stable timezone parts for now helper', () => {
    const parts = getNowInTimezone('Asia/Kolkata', new Date('2026-06-28T20:30:00.000Z'))

    expect(parts.isoDate).toBe('2026-06-29')
    expect(parts.timeZone).toBe('Asia/Kolkata')
    expect(parts.hour).toBe('02')
  })
})
