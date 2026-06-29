type TimezoneParts = {
  timeZone: string
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
}

function resolveTimezone(timezone?: string) {
  return timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
}

function readParts(timezone?: string, date = new Date()): TimezoneParts {
  const timeZone = resolveTimezone(timezone)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))

  return {
    timeZone,
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

// Date-only records must be created in the user's timezone, not UTC.
// `toISOString().slice(0, 10)` shifts users east/west of UTC into the wrong day.
export function getLocalISODate(timezone?: string, date = new Date()): string {
  const parts = readParts(timezone, date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function getTodayInTimezone(timezone?: string): string {
  return getLocalISODate(timezone)
}

export function getLocalISODateWithOffset(daysOffset: number, timezone?: string, date = new Date()): string {
  const targetDate = new Date(date)
  targetDate.setDate(targetDate.getDate() + daysOffset)
  return getLocalISODate(timezone, targetDate)
}

export function getCurrentDate(): Date {
  return new Date()
}

export function getNowInTimezone(timezone?: string, date = new Date()): TimezoneParts & { isoDate: string } {
  const parts = readParts(timezone, date)
  return { ...parts, isoDate: `${parts.year}-${parts.month}-${parts.day}` }
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}
