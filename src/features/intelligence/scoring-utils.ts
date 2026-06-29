export function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

export function round(value: number) {
  return Math.round(clamp(value))
}

export function average(values: number[]) {
  if (!values.length) return 70
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function scaleFivePoint(value: number | null | undefined, direction: 'higher-is-better' | 'lower-is-better') {
  if (value === null || value === undefined) return null
  const normalized = direction === 'higher-is-better' ? value : 6 - value
  return round(25 + normalized * 15)
}
