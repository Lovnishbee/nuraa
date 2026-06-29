import type { DailyCheckInInput } from '../checkins'
import { getDashboardIntelligenceSummary } from '../dashboardService'
import { getInsightsSummary as getInsightsSummaryInternal } from '../insightsService'
import { getProgressSummary as getProgressSummaryInternal, type ProgressRange } from '../progressService'
import { localIntelligenceProvider } from './provider'

export type { ProgressRange }
export type { CheckInIntelligenceSaveResult, IntelligenceProvider } from './provider'

export function generateForCheckin(userId: string, input: DailyCheckInInput) {
  return localIntelligenceProvider.generate(userId, input)
}

export function backfillUser(userId: string) {
  return localIntelligenceProvider.backfill(userId)
}

export function getDashboardSummary(userId: string) {
  return getDashboardIntelligenceSummary(userId)
}

export function getProgressSummary(userId: string, range: ProgressRange) {
  return getProgressSummaryInternal(userId, range)
}

export function getInsightsSummary(userId: string) {
  return getInsightsSummaryInternal(userId)
}
