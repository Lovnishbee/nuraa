export type TimeOfDayGreeting = 'Good morning' | 'Good afternoon' | 'Good evening'

function getHourInTimeZone(date: Date, timeZone?: string) {
  try {
    const hour = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone,
    }).formatToParts(date).find((part) => part.type === 'hour')?.value

    return hour ? Number(hour) % 24 : date.getHours()
  } catch {
    return date.getHours()
  }
}

export function getTimeOfDayGreeting(date = new Date(), timeZone?: string): TimeOfDayGreeting {
  const hour = getHourInTimeZone(date, timeZone)

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
