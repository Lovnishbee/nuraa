import type { RuntimeSupabaseClient } from '../ai/types.ts'

export const WEEKLY_REFLECTION_ENGINE_VERSION = 'phase-v-c.v1'

export type WeeklyReflectionStatus = 'generated' | 'viewed' | 'dismissed' | 'converted_to_coach' | 'expired'
export type WeeklyConfidence = 'high' | 'moderate' | 'low'
export type ScoreDirection = 'up' | 'down' | 'stable' | 'insufficient_data'

export type WeeklyReflectionSourceReference = {
  sourceReference: string
  label: string
  explanation: string
}

export type WeeklyReflectionPayload = {
  headline: string
  weekAtGlance: {
    summary: string
    averageScore: number | null
    scoreDirection: ScoreDirection
    confidence: WeeklyConfidence
  }
  whatChanged: Array<{ title: string; explanation: string; sourceReference: string }>
  whatSupportedYou: Array<{ title: string; explanation: string; sourceReference: string }>
  attentionAreas: Array<{ title: string; explanation: string; sourceReference: string }>
  nextWeekFocus: { title: string; detail: string }
  suggestedCoachPrompts: string[]
  confidenceNote: string | null
  sourceReferences: string[]
}

export type WeeklyReflectionMetrics = {
  weekStartDate: string
  weekEndDate: string
  previousWeekStartDate: string
  previousWeekEndDate: string
  averageScore: number | null
  previousAverageScore: number | null
  scoreDeltaVsPreviousWeek: number | null
  scoreDirection: ScoreDirection
  readinessCategoryDistribution: Record<string, number>
  strongestFactor: string | null
  weakestFactor: string | null
  mostImprovedFactor: string | null
  lowestConfidenceArea: string | null
  checkinCoverage: number
  topPatterns: Array<{ title: string; detail: string; sourceReference: string }>
  topDataGaps: string[]
  primaryNextWeekFocus: { title: string; detail: string }
  confidence: WeeklyConfidence
  confidenceNote: string | null
  sourceReferences: WeeklyReflectionSourceReference[]
}

export type WeeklyReflection = {
  id: string
  user_id: string
  week_start_date: string
  week_end_date: string
  status: WeeklyReflectionStatus
  summary_payload: WeeklyReflectionPayload
  deterministic_metrics: WeeklyReflectionMetrics
  source_references: WeeklyReflectionSourceReference[]
  context_envelope_id: string | null
  ai_execution_id: string | null
  viewed_at: string | null
  dismissed_at: string | null
  converted_to_coach_at: string | null
  created_at: string
  updated_at: string
}

export type WeeklyReflectionSnapshot = {
  userId: string
  timezone: string
  healthDate: string
  weekStartDate: string
  weekEndDate: string
  previousWeekStartDate: string
  previousWeekEndDate: string
  nowIso: string
  scores: Array<Record<string, unknown>>
  scoreFactors: Array<Record<string, unknown>>
  healthSignals: Array<Record<string, unknown>>
  dailyBriefs: Array<Record<string, unknown>>
  insightEvents: Array<Record<string, unknown>>
  goals: Array<Record<string, unknown>>
  cardFeedback: Array<Record<string, unknown>>
  checkins: Array<Record<string, unknown>>
}

export type WeeklyReflectionRuntimeEnv = Record<string, string | undefined>
export type WeeklyReflectionSupabaseClient = RuntimeSupabaseClient

