import { getLocalISODate } from '../ai/date.ts'
import type { WeeklyReflectionMetrics, WeeklyReflectionPayload, WeeklyReflectionSnapshot, WeeklyReflectionSourceReference } from './types.ts'

const factorKeys = ['sleep_score', 'stress_score', 'recovery_score', 'activity_score', 'nutrition_score', 'hydration_score'] as const

export function buildWeeklyWindow(timezone: string, now = new Date()) {
  const weekEndDate = getLocalISODate(timezone, now)
  const weekStartDate = getLocalISODate(timezone, addDays(now, -6))
  const previousWeekEndDate = getLocalISODate(timezone, addDays(now, -7))
  const previousWeekStartDate = getLocalISODate(timezone, addDays(now, -13))
  return { weekStartDate, weekEndDate, previousWeekStartDate, previousWeekEndDate }
}

export function buildWeeklyReflectionMetrics(snapshot: WeeklyReflectionSnapshot): WeeklyReflectionMetrics {
  const currentScores = inDateRange(snapshot.scores, 'score_date', snapshot.weekStartDate, snapshot.weekEndDate)
  const previousScores = inDateRange(snapshot.scores, 'score_date', snapshot.previousWeekStartDate, snapshot.previousWeekEndDate)
  const currentFactors = inDateRange(snapshot.scoreFactors, 'score_date', snapshot.weekStartDate, snapshot.weekEndDate)
  const previousFactors = inDateRange(snapshot.scoreFactors, 'score_date', snapshot.previousWeekStartDate, snapshot.previousWeekEndDate)
  const checkins = inDateRange(snapshot.checkins, 'checkin_date', snapshot.weekStartDate, snapshot.weekEndDate)
  const averageScore = average(currentScores.map((row) => readNumber(row, 'total_score')))
  const previousAverageScore = average(previousScores.map((row) => readNumber(row, 'total_score')))
  const scoreDelta = averageScore === null || previousAverageScore === null ? null : Math.round(averageScore - previousAverageScore)
  const factorAverages = averageFactors(currentFactors)
  const previousFactorAverages = averageFactors(previousFactors)
  const strongestFactor = pickFactor(factorAverages, 'max')
  const weakestFactor = pickFactor(factorAverages, 'min')
  const mostImprovedFactor = pickMostImprovedFactor(factorAverages, previousFactorAverages)
  const sourceReferences = buildSourceReferences(snapshot)
  const topPatterns = buildTopPatterns(snapshot, sourceReferences)
  const topDataGaps = buildTopDataGaps(snapshot, checkins.length, currentScores.length, currentFactors.length)
  const checkinCoverage = Math.min(100, Math.round((new Set(checkins.map((row) => readString(row, 'checkin_date'))).size / 7) * 100))
  const confidence = confidenceLabel(checkinCoverage, currentScores.length, currentFactors.length)
  const primaryNextWeekFocus = buildPrimaryFocus(weakestFactor, topDataGaps)

  return {
    weekStartDate: snapshot.weekStartDate,
    weekEndDate: snapshot.weekEndDate,
    previousWeekStartDate: snapshot.previousWeekStartDate,
    previousWeekEndDate: snapshot.previousWeekEndDate,
    averageScore,
    previousAverageScore,
    scoreDeltaVsPreviousWeek: scoreDelta,
    scoreDirection: scoreDirection(scoreDelta),
    readinessCategoryDistribution: distribution(currentScores, 'readiness_category'),
    strongestFactor: formatFactor(strongestFactor),
    weakestFactor: formatFactor(weakestFactor),
    mostImprovedFactor: formatFactor(mostImprovedFactor),
    lowestConfidenceArea: topDataGaps[0] ?? null,
    checkinCoverage,
    topPatterns,
    topDataGaps,
    primaryNextWeekFocus,
    confidence,
    confidenceNote: confidence === 'low' ? 'Nuraa has limited confidence because this week has partial signal coverage.' : null,
    sourceReferences,
  }
}

export function buildDeterministicWeeklyReflectionPayload(metrics: WeeklyReflectionMetrics): WeeklyReflectionPayload {
  const scoreText = metrics.averageScore === null ? 'Nuraa is still building your weekly baseline.' : `Your average Nuraa Score was ${metrics.averageScore}.`
  const directionText = metrics.scoreDirection === 'insufficient_data'
    ? 'There is not enough previous-week data for a reliable comparison.'
    : metrics.scoreDirection === 'stable'
      ? 'Your readiness stayed broadly stable compared with the previous window.'
      : `Your readiness moved ${metrics.scoreDirection === 'up' ? 'up' : 'down'} by ${Math.abs(metrics.scoreDeltaVsPreviousWeek ?? 0)} point${Math.abs(metrics.scoreDeltaVsPreviousWeek ?? 0) === 1 ? '' : 's'}.`

  return {
    headline: headlineForMetrics(metrics),
    weekAtGlance: {
      summary: `${scoreText} ${directionText}`,
      averageScore: metrics.averageScore,
      scoreDirection: metrics.scoreDirection,
      confidence: metrics.confidence,
    },
    whatChanged: metrics.topPatterns.slice(0, 3).map((pattern) => ({
      title: pattern.title,
      explanation: pattern.detail,
      sourceReference: pattern.sourceReference,
    })),
    whatSupportedYou: supportedItems(metrics),
    attentionAreas: attentionItems(metrics),
    nextWeekFocus: metrics.primaryNextWeekFocus,
    suggestedCoachPrompts: [
      'What mattered most this week?',
      'What should I focus on next week?',
      'What data would improve this reflection?',
    ],
    confidenceNote: metrics.confidenceNote,
    sourceReferences: metrics.sourceReferences.map((reference) => reference.sourceReference).slice(0, 12),
  }
}

function supportedItems(metrics: WeeklyReflectionMetrics) {
  if (!metrics.strongestFactor) return []
  return [{
    title: `${metrics.strongestFactor} supported you`,
    explanation: `This was the strongest available weekly factor based on Nuraa’s deterministic score factors.`,
    sourceReference: firstSource(metrics, 'score_factors'),
  }]
}

function attentionItems(metrics: WeeklyReflectionMetrics) {
  const items: WeeklyReflectionPayload['attentionAreas'] = []
  if (metrics.weakestFactor) {
    items.push({
      title: `${metrics.weakestFactor} may need attention`,
      explanation: 'This was the lowest available weekly factor. Keep the next step small and practical.',
      sourceReference: firstSource(metrics, 'score_factors'),
    })
  }
  if (metrics.topDataGaps.length) {
    items.push({
      title: 'Signal coverage is still building',
      explanation: metrics.topDataGaps[0],
      sourceReference: 'deterministic:nuraa',
    })
  }
  return items.slice(0, 2)
}

function headlineForMetrics(metrics: WeeklyReflectionMetrics) {
  if (metrics.confidence === 'low') return 'Your weekly baseline is taking shape.'
  if (metrics.scoreDirection === 'up') return 'Your week shows a steadier readiness pattern.'
  if (metrics.scoreDirection === 'down') return 'This week may benefit from a gentler reset.'
  return 'Your week looks broadly steady.'
}

function firstSource(metrics: WeeklyReflectionMetrics, prefix: string) {
  return metrics.sourceReferences.find((reference) => reference.sourceReference.startsWith(`${prefix}:`))?.sourceReference ?? 'deterministic:nuraa'
}

function buildPrimaryFocus(weakestFactor: string | null, gaps: string[]) {
  if (weakestFactor === 'sleep_score') return { title: 'Protect your sleep window', detail: 'Choose one repeatable bedtime cue for the next week.' }
  if (weakestFactor === 'stress_score') return { title: 'Create one reset window', detail: 'Add a short pause before your most demanding part of the day.' }
  if (weakestFactor === 'hydration_score') return { title: 'Keep hydration visible', detail: 'Place water where you work so the habit is easier to repeat.' }
  if (gaps.length) return { title: 'Improve signal coverage', detail: 'Complete a few check-ins next week so Nuraa can reflect with more confidence.' }
  return { title: 'Keep one steady habit', detail: 'Repeat the smallest useful action that helped this week.' }
}

function buildTopDataGaps(snapshot: WeeklyReflectionSnapshot, checkinCount: number, scoreCount: number, factorCount: number) {
  const gaps: string[] = []
  if (checkinCount < 4) gaps.push('More daily check-ins would improve weekly confidence.')
  if (scoreCount < 4) gaps.push('More Nuraa Score history would improve weekly trend comparison.')
  if (factorCount < 4) gaps.push('More score factor history would improve factor-level reflection.')
  if (!snapshot.goals.length) gaps.push('Adding an active goal would make weekly focus more personal.')
  return gaps.slice(0, 4)
}

function buildTopPatterns(snapshot: WeeklyReflectionSnapshot, sources: WeeklyReflectionSourceReference[]) {
  const patterns = snapshot.insightEvents.slice(0, 3).map((event) => ({
    title: safeWeeklyText(readString(event, 'title', readString(event, 'rule_id', 'Weekly pattern')), 'Weekly pattern', 120),
    detail: safeWeeklyText(readString(event, 'description', readString(event, 'recommendation', 'Nuraa noticed this from deterministic weekly signals.')), 'Nuraa noticed this from deterministic weekly signals.', 280),
    sourceReference: `insight_event:${readString(event, 'id')}`,
  })).filter((item) => !item.sourceReference.endsWith(':'))
  if (patterns.length) return patterns
  const scoreSource = sources.find((source) => source.sourceReference.startsWith('score:'))?.sourceReference ?? 'deterministic:nuraa'
  return [{ title: 'Readiness trend', detail: 'Nuraa summarised this week using available score and signal history.', sourceReference: scoreSource }]
}

function buildSourceReferences(snapshot: WeeklyReflectionSnapshot): WeeklyReflectionSourceReference[] {
  return [
    ...snapshot.scores.slice(0, 3).map((row) => ref('score', row, 'Nuraa Score', 'Weekly readiness score used in this reflection.')),
    ...snapshot.scoreFactors.slice(0, 3).map((row) => ref('score_factors', row, 'Score factors', 'Weekly score factors used in this reflection.')),
    ...snapshot.healthSignals.slice(0, 3).map((row) => ref('signal', row, 'Health signal', 'Structured health signal used in this reflection.')),
    ...snapshot.dailyBriefs.slice(0, 2).map((row) => ref('daily_brief', row, 'Daily brief', 'Daily brief used as safe weekly context.')),
    ...snapshot.insightEvents.slice(0, 3).map((row) => ref('insight_event', row, 'Insight event', 'Rule-based insight used as weekly context.')),
    { sourceReference: 'deterministic:nuraa', label: 'Nuraa deterministic engine', explanation: 'Used when signal coverage is limited.' },
  ].filter((reference) => !reference.sourceReference.endsWith(':')).slice(0, 12)
}

function ref(prefix: string, row: Record<string, unknown>, label: string, explanation: string): WeeklyReflectionSourceReference {
  return { sourceReference: `${prefix}:${readString(row, 'id')}`, label, explanation }
}

function averageFactors(rows: Array<Record<string, unknown>>) {
  const result: Partial<Record<typeof factorKeys[number], number | null>> = {}
  for (const key of factorKeys) result[key] = average(rows.map((row) => readNumber(row, key)))
  return result
}

function pickMostImprovedFactor(current: Partial<Record<typeof factorKeys[number], number | null>>, previous: Partial<Record<typeof factorKeys[number], number | null>>) {
  const deltas = factorKeys
    .map((key) => ({ key, delta: current[key] === null || previous[key] === null || current[key] === undefined || previous[key] === undefined ? null : current[key]! - previous[key]! }))
    .filter((item): item is { key: typeof factorKeys[number]; delta: number } => item.delta !== null)
  return deltas.sort((a, b) => b.delta - a.delta)[0]?.key ?? null
}

function pickFactor(values: Partial<Record<typeof factorKeys[number], number | null>>, mode: 'min' | 'max') {
  const entries = factorKeys
    .map((key) => ({ key, value: values[key] }))
    .filter((item): item is { key: typeof factorKeys[number]; value: number } => typeof item.value === 'number')
  return entries.sort((a, b) => mode === 'min' ? a.value - b.value : b.value - a.value)[0]?.key ?? null
}

function scoreDirection(delta: number | null) {
  if (delta === null) return 'insufficient_data'
  if (Math.abs(delta) < 3) return 'stable'
  return delta > 0 ? 'up' : 'down'
}

function confidenceLabel(checkinCoverage: number, scoreCount: number, factorCount: number) {
  if (checkinCoverage >= 70 && scoreCount >= 5 && factorCount >= 5) return 'high'
  if (checkinCoverage >= 45 && scoreCount >= 3) return 'moderate'
  return 'low'
}

function distribution(rows: Array<Record<string, unknown>>, key: string) {
  const result: Record<string, number> = {}
  for (const row of rows) {
    const value = readString(row, key, 'Unknown')
    result[value] = (result[value] ?? 0) + 1
  }
  return result
}

function inDateRange(rows: Array<Record<string, unknown>>, key: string, start: string, end: string) {
  return rows.filter((row) => {
    const value = readString(row, key)
    return value >= start && value <= end
  })
}

function average(values: Array<number | null>): number | null {
  const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (!numbers.length) return null
  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length)
}

function readString(value: unknown, key: string, fallback = ''): string {
  if (!value || typeof value !== 'object') return fallback
  const item = (value as Record<string, unknown>)[key]
  return typeof item === 'string' ? item : fallback
}

function readNumber(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const item = (value as Record<string, unknown>)[key]
  return typeof item === 'number' && Number.isFinite(item) ? item : null
}

function formatFactor(factor: string | null) {
  return factor ? factor.replace('_score', '') : null
}

function safeWeeklyText(value: string, fallback: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized || containsProhibitedWeeklyLanguage(normalized)) return fallback
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function containsProhibitedWeeklyLanguage(value: string) {
  return [
    /\byou are at risk\b/i,
    /\bthis caused\b/i,
    /\byou have\b/i,
    /\byou should take medication\b/i,
    /\bthis indicates disease\b/i,
    /\byou need treatment\b/i,
    /\bdiagnos(e|is|ed)\b/i,
    /\b(start|stop|change|increase|decrease)\s+(your\s+)?(medication|medicine|dose|dosage|tablet|insulin|metformin)\b/i,
  ].some((pattern) => pattern.test(value))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
