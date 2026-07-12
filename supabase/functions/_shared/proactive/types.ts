export const PROACTIVE_ENGINE_VERSION = 'phase-v-a.v1'
export const PROACTIVE_CARD_ENGINE_VERSION = 'phase-v-b.v1'

export type CandidateType = 'observation' | 'opportunity' | 'attention' | 'celebration' | 'data_gap'
export type CandidateCategory = 'sleep' | 'stress' | 'recovery' | 'energy' | 'activity' | 'nutrition' | 'hydration' | 'mood' | 'consistency' | 'goal_progress' | 'readiness' | 'data_gap' | 'weekly_pattern' | 'coach_followup'
export type CandidateSeverity = 'low' | 'medium' | 'high'
export type ConfidenceLabel = 'high' | 'moderate' | 'low' | 'insufficient'
export type CandidateStatus = 'candidate' | 'approved' | 'suppressed' | 'expired' | 'converted_to_card' | 'rejected'
export type ProactiveCardStatus = 'active' | 'shown' | 'dismissed' | 'snoozed' | 'expired' | 'archived'
export type ProactiveCardFeedbackType = 'helpful' | 'not_helpful' | 'not_relevant' | 'too_frequent' | 'show_less_like_this'
export type ProactiveCardEventType = 'created' | 'shown' | 'opened' | 'dismissed' | 'snoozed' | 'feedback_submitted' | 'coach_handoff_started'

export type SourceReference = {
  sourceReference: string
  label: string
  explanation: string
}

export type WhyThisEvidence = {
  summary: string
  evidence: SourceReference[]
  confidence: Exclude<ConfidenceLabel, 'insufficient'> | 'low'
  limitations: string[]
}

export type RecommendedAction = {
  title: string
  detail: string | null
}

export type InsightCandidate = {
  id?: string
  user_id: string
  health_date: string
  theme_key: string
  candidate_hash: string
  data_window_start: string
  data_window_end: string
  candidate_type: CandidateType
  category: CandidateCategory
  severity: CandidateSeverity
  confidence_score: number
  confidence_label: ConfidenceLabel
  deterministic_title: string
  deterministic_summary: string
  recommended_action: RecommendedAction | null
  evidence_json: WhyThisEvidence
  source_references: string[]
  ranking_score: number | null
  status: CandidateStatus
  eligible_from: string
  expires_at: string
  suppression_reason: string | null
  created_by_engine_version: string
  created_at?: string
  updated_at?: string
}

export type ProactiveCard = {
  id?: string
  user_id: string
  candidate_id: string
  health_date: string
  card_type: CandidateType
  category: CandidateCategory
  severity: CandidateSeverity
  title: string
  body: string
  primary_action_label: string | null
  primary_action_type: string | null
  primary_action_payload: Record<string, unknown>
  evidence_refs: SourceReference[]
  confidence_score: number | null
  confidence_label: ConfidenceLabel | null
  status: ProactiveCardStatus
  source_engine_version: string
  copy_source: 'deterministic' | 'ai_rewrite'
  shown_at: string | null
  dismissed_at: string | null
  snoozed_until: string | null
  created_at?: string
  updated_at?: string
}

export type ProactiveCardFeedback = {
  id?: string
  user_id: string
  card_id: string
  feedback_type: ProactiveCardFeedbackType
  feedback_reason: string | null
  created_at?: string
}

export type ProactiveCardEvent = {
  id?: string
  user_id: string
  card_id: string
  event_type: ProactiveCardEventType
  event_payload: Record<string, unknown>
  created_at?: string
}

export type ProactiveGuidancePreferences = {
  user_id: string
  proactive_guidance_enabled: boolean
  max_cards_per_day: number
  muted_categories: string[]
  reduced_categories: string[]
  last_preference_update_at?: string | null
}

export type ScoreRow = {
  id: string
  user_id: string
  score_date: string
  total_score: number | null
  readiness_category: string | null
  confidence: number | null
  primary_driver?: string | null
  limiting_factor?: string | null
}

export type ScoreFactorRow = {
  id: string
  user_id: string
  score_date: string
  sleep_score: number | null
  stress_score: number | null
  recovery_score: number | null
  activity_score: number | null
  nutrition_score: number | null
  hydration_score: number | null
  confidence: number | null
  primary_driver?: string | null
  limiting_factor?: string | null
}

export type HealthSignalRow = {
  id: string
  user_id: string
  signal_date: string
  sleep_hours: number | null
  sleep_quality: number | null
  stress_level: number | null
  energy_level: number | null
  soreness_level: number | null
  motivation_level: number | null
  mood: string | null
  activity_score: number | null
  nutrition_score: number | null
  hydration_score: number | null
  recovery_score: number | null
  sleep_score: number | null
  stress_score: number | null
  overall_signal_confidence: number | null
}

export type DailyCheckinSafeRow = {
  id: string
  user_id: string
  checkin_date: string
  stress_level: number | null
  sleep_quality: number | null
  energy_level: number | null
  created_at: string
}

export type DailyBriefRow = {
  id: string
  user_id: string
  brief_date: string
  headline: string | null
  tone: string | null
}

export type InsightEventRow = {
  id: string
  user_id: string
  event_date: string
  rule_id: string | null
  category: string | null
  severity: string | null
}

export type UserGoalRow = {
  id: string
  user_id: string
  goal_type: string | null
  goal_label: string | null
  priority: number | null
  status: string | null
}

export type UserPreferencesSafeRow = {
  id: string
  user_id: string
  diet_preference: string | null
  preferred_workout_time: string | null
  work_type: string | null
  work_schedule: string | null
  commute_minutes: number | null
  travel_frequency: string | null
}

export type CoachFeedbackAggregate = {
  feedback_type: string
  count: number
}

export type ProactiveSnapshot = {
  userId: string
  timezone: string
  healthDate: string
  windowStart: string
  windowEnd: string
  nowIso: string
  scores: ScoreRow[]
  scoreFactors: ScoreFactorRow[]
  healthSignals: HealthSignalRow[]
  dailyCheckins: DailyCheckinSafeRow[]
  dailyBriefs: DailyBriefRow[]
  insightEvents: InsightEventRow[]
  goals: UserGoalRow[]
  userPreferences: UserPreferencesSafeRow | null
  coachFeedback: CoachFeedbackAggregate[]
  existingCandidates: InsightCandidate[]
  existingCards?: ProactiveCard[]
  recentFeedback?: ProactiveCardFeedback[]
  preferences: ProactiveGuidancePreferences
}

export type ConfidenceBreakdown = {
  score: number
  label: ConfidenceLabel
  dataCoverageScore: number
  signalConsistencyScore: number
  recencyScore: number
  sourceQualityScore: number
  contradictionPenalty: number
  limitations: string[]
}

export type RankingBreakdown = {
  score: number
  confidenceWeight: number
  recencyWeight: number
  goalRelevance: number
  categoryPriority: number
  noveltyBonus: number
  actionabilityScore: number
  fatiguePenalty: number
  dismissalPenalty: number
  repetitionPenalty: number
  lowConfidencePenalty: number
}

export type GeneratedCandidate = InsightCandidate & {
  confidenceBreakdown: ConfidenceBreakdown
  rankingBreakdown?: RankingBreakdown
}

export type ProactiveGenerationResult = {
  status: 'completed' | 'disabled'
  healthDate: string
  generated: number
  approved: number
  suppressed: number
  candidates: InsightCandidate[]
}

export type ProactiveCardGenerationResult = {
  status: 'completed' | 'disabled'
  healthDate: string
  generated: number
  cards: ProactiveCard[]
  suppressed: Array<{ candidateId: string; themeKey: string; reason: string }>
}

export type ProactiveRuntimeEnv = Record<string, string | undefined>

export type ProactiveSupabaseClient = {
  from: (table: string) => ProactiveQueryBuilder
  auth?: {
    getUser: (jwt?: string) => Promise<{ data?: { user?: { id?: string } | null } | null; error?: unknown }>
  }
}

export type ProactiveQueryBuilder = {
  select: (columns?: string) => ProactiveQueryBuilder
  insert: (values: unknown) => ProactiveQueryBuilder
  upsert: (values: unknown, options?: unknown) => ProactiveQueryBuilder
  update: (values: unknown) => ProactiveQueryBuilder
  eq: (column: string, value: unknown) => ProactiveQueryBuilder
  gte: (column: string, value: unknown) => ProactiveQueryBuilder
  lte: (column: string, value: unknown) => ProactiveQueryBuilder
  in: (column: string, value: unknown[]) => ProactiveQueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => ProactiveQueryBuilder
  limit: (count: number) => ProactiveQueryBuilder
  maybeSingle: <T = unknown>() => Promise<{ data: T | null; error: unknown | null }>
  single: <T = unknown>() => Promise<{ data: T | null; error: unknown | null }>
  then: <TResult1 = { data: unknown[] | null; error: unknown | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[] | null; error: unknown | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => PromiseLike<TResult1 | TResult2>
}
