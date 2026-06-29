export function getLocalISODate(timezone: string, date = new Date()): string {
  // Use Intl parts so health dates follow the user's timezone instead of UTC string slicing.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getTimeOfDay(timezone: string, date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hourPart = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }).formatToParts(date).find((part) => part.type === 'hour')?.value ?? '0'
  const hour = Number(hourPart)
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}
