export type CandidateType = 'observation' | 'opportunity' | 'attention' | 'celebration' | 'data_gap'
export type CandidateCategory = 'sleep' | 'stress' | 'recovery' | 'energy' | 'activity' | 'nutrition' | 'hydration' | 'mood' | 'consistency' | 'goal_progress' | 'readiness' | 'data_gap' | 'weekly_pattern' | 'coach_followup'
export type CandidateSeverity = 'low' | 'medium' | 'high'
export type ConfidenceLabel = 'high' | 'moderate' | 'low' | 'insufficient'
export type CandidateStatus = 'candidate' | 'approved' | 'suppressed' | 'expired' | 'converted_to_card' | 'rejected'

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
  action: 'generate_candidates' | 'get_summary'
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
}
