export type CandidateType = 'observation' | 'opportunity' | 'attention' | 'celebration' | 'data_gap'
export type CandidateCategory = 'sleep' | 'stress' | 'recovery' | 'energy' | 'activity' | 'nutrition' | 'hydration' | 'mood' | 'consistency' | 'goal_progress' | 'readiness' | 'data_gap' | 'weekly_pattern' | 'coach_followup'
export type CandidateSeverity = 'low' | 'medium' | 'high'
export type ConfidenceLabel = 'high' | 'moderate' | 'low' | 'insufficient'
export type CandidateStatus = 'candidate' | 'approved' | 'suppressed' | 'expired' | 'converted_to_card' | 'rejected'
export type ProactiveCardStatus = 'active' | 'shown' | 'dismissed' | 'snoozed' | 'expired' | 'archived'
export type ProactiveCardFeedbackType = 'helpful' | 'not_helpful' | 'not_relevant' | 'too_frequent' | 'show_less_like_this'

export type ProactiveEvidenceItem = {
  label: string
  explanation: string
  sourceReference: string
}

export type ProactiveEvidence = {
  summary: string
  evidence: ProactiveEvidenceItem[]
  confidence: ConfidenceLabel
  limitations: string[]
}

export type InsightCandidate = {
  id: string
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
  recommended_action: { title: string; detail: string | null } | null
  evidence_json: ProactiveEvidence
  source_references: string[]
  ranking_score: number | null
  status: CandidateStatus
  eligible_from: string
  expires_at: string
  suppression_reason: string | null
  created_by_engine_version: string
  created_at: string
  updated_at: string
}

export type ProactiveCard = {
  id: string
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
  evidence_refs: ProactiveEvidenceItem[]
  confidence_score: number | null
  confidence_label: ConfidenceLabel | null
  status: ProactiveCardStatus
  source_engine_version: string
  copy_source: 'deterministic' | 'ai_rewrite'
  shown_at: string | null
  dismissed_at: string | null
  snoozed_until: string | null
  created_at: string
  updated_at: string
}

export type ProactiveGuidancePreferences = {
  user_id: string
  proactive_guidance_enabled: boolean
  max_cards_per_day: number
  muted_categories: string[]
  reduced_categories: string[]
  last_preference_update_at: string | null
  created_at: string
  updated_at: string
}

export type ProactiveEngineInput = {
  action: 'generate_candidates' | 'get_summary' | 'generate_cards' | 'get_cards' | 'mark_shown' | 'dismiss_card' | 'snooze_card' | 'submit_feedback' | 'start_coach_handoff'
  cardId?: string
  feedbackType?: ProactiveCardFeedbackType
  feedbackReason?: string
}

export type ProactiveEngineResponse = {
  requestId: string
  status: 'completed' | 'disabled'
  reason?: string
  healthDate?: string
  generated?: number
  approved?: number
  suppressed?: number
  candidates: InsightCandidate[]
  cards?: ProactiveCard[]
  card?: ProactiveCard
  conversationId?: string
}
