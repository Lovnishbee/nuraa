import { describe, expect, it } from 'vitest'
import { getTimeOfDayGreeting } from './greeting'

describe('getTimeOfDayGreeting', () => {
  it('returns morning before noon', () => {
    expect(getTimeOfDayGreeting(new Date('2026-06-25T08:30:00+05:30'), 'Asia/Kolkata')).toBe('Good morning')
  })

  it('returns afternoon from noon until before 5pm', () => {
    expect(getTimeOfDayGreeting(new Date('2026-06-25T14:30:00+05:30'), 'Asia/Kolkata')).toBe('Good afternoon')
  })

  it('returns evening at 7:45pm', () => {
    expect(getTimeOfDayGreeting(new Date('2026-06-25T19:45:00+05:30'), 'Asia/Kolkata')).toBe('Good evening')
  })

  it('uses the supplied profile timezone instead of the machine timezone', () => {
    expect(getTimeOfDayGreeting(new Date('2026-06-25T14:15:00Z'), 'Asia/Kolkata')).toBe('Good evening')
  })
})
