export type Profile = {
  id: string; full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null
  date_of_birth: string | null; age: number | null; gender: string | null; location_city: string | null
  location_country: string | null; timezone: string; onboarding_completed: boolean; created_at: string; updated_at: string
}

export type HealthProfile = {
  id: string; user_id: string; height_cm: number | null; weight_kg: number | null; target_weight_kg: number | null
  activity_level: string | null; fitness_level: string | null; medical_conditions: string[]; injuries: string[]
  allergies: string[]; dietary_restrictions: string[]; created_at: string; updated_at: string
}

export type UserGoal = { id: string; user_id: string; goal_type: string; goal_label: string; priority: number; status: string; created_at: string }
export type UserPreferences = {
  id: string; user_id: string; diet_preference: string | null; cuisine_preferences: string[]; disliked_foods: string[]
  preferred_workout_types: string[]; available_equipment: string[]; preferred_workout_time: string | null
  work_type: string | null; work_schedule: string | null; commute_minutes: number | null; travel_frequency: string | null
  notification_preference: string | null; created_at: string; updated_at: string
}
export type UserPermissions = {
  id: string; user_id: string; calendar_connected: boolean; location_enabled: boolean; notifications_enabled: boolean
  camera_enabled: boolean; microphone_enabled: boolean; health_reports_enabled: boolean; created_at: string; updated_at: string
}
export type NuraaScore = {
  id: string
  user_id: string
  score_date: string
  total_score: number | null
  readiness_category: string | null
  score_reason: string | null
  recommended_focus: string | null
  confidence: number | null
  primary_driver: string | null
  limiting_factor: string | null
  created_at: string
}
export type DailyCheckin = {
  id: string
  user_id: string
  checkin_date: string
  mood: string | null
  energy_level: number | null
  stress_level: number | null
  sleep_quality: number | null
  sleep_hours: number | null
  notes: string | null
  created_at: string
}
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MealLog = {
  id: string
  user_id: string
  meal_date: string
  meal_type: MealType
  meal_name: string
  notes: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  logged_at: string
  created_at: string
  updated_at: string
}
export type WorkoutActivityType = 'walk' | 'run' | 'strength' | 'mobility' | 'yoga' | 'cycling' | 'sport' | 'other'
export type WorkoutIntensity = 'easy' | 'moderate' | 'hard'
export type WorkoutLog = {
  id: string
  user_id: string
  workout_date: string
  activity_type: WorkoutActivityType
  title: string
  duration_minutes: number
  intensity: WorkoutIntensity
  calories_burned: number | null
  notes: string | null
  completed_at: string
  created_at: string
  updated_at: string
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
  raw_signal_json: unknown | null
  created_at: string
  updated_at: string
}
export type DailyBriefRow = {
  id: string
  user_id: string
  brief_date: string
  headline: string | null
  summary: string | null
  focus_items: unknown | null
  insight: string | null
  tone: string | null
  source: string
  created_at: string
  updated_at: string
}
export type InsightEvent = {
  id: string
  user_id: string
  event_date: string
  rule_id: string | null
  title: string | null
  description: string | null
  category: string | null
  severity: string | null
  recommendation: string | null
  created_at: string
}
export type ScoreFactor = {
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
  primary_driver: string | null
  limiting_factor: string | null
  created_at: string
}
export type UserAIPreferences = {
  id: string
  user_id: string
  ai_coaching_enabled: boolean
  ai_coaching_policy_version: string | null
  ai_coaching_consented_at: string | null
  ai_coaching_disabled_at: string | null
  response_detail: 'concise' | 'balanced' | 'detailed'
  created_at: string
  updated_at: string
}
export type CoachConversation = {
  id: string
  user_id: string
  entry_point: string
  initial_task_type: string
  status: 'active' | 'paused' | 'resolved' | 'archived' | 'deleted'
  deterministic_title: string | null
  latest_context_envelope_id: string | null
  last_context_at: string | null
  last_active_at: string
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}
export type CoachMessage = {
  id: string
  conversation_id: string
  user_id: string
  sequence_number: number
  ai_execution_id: string | null
  client_request_key: string | null
  role: 'user' | 'nuraa' | 'system'
  task_type: string
  message_type: 'coach_opening' | 'score_explanation' | 'coach_follow_up' | 'clarifying_question' | 'safety_response' | 'fallback'
  content: string | null
  structured_payload: unknown | null
  source_references: unknown | null
  validation_status: string
  created_at: string
}
export type CoachFeedback = {
  id: string
  user_id: string
  conversation_id: string
  message_id: string
  feedback_type: 'helpful' | 'not_helpful' | 'too_generic' | 'not_relevant' | 'too_much_detail' | 'not_enough_detail' | 'poor_timing'
  reason: string | null
  created_at: string
}
export type InsightCandidate = {
  id: string
  user_id: string
  health_date: string
  theme_key: string
  candidate_hash: string
  data_window_start: string
  data_window_end: string
  candidate_type: 'observation' | 'opportunity' | 'attention' | 'celebration' | 'data_gap'
  category: 'sleep' | 'stress' | 'recovery' | 'energy' | 'activity' | 'nutrition' | 'hydration' | 'mood' | 'consistency' | 'goal_progress' | 'readiness' | 'data_gap' | 'weekly_pattern' | 'coach_followup'
  severity: 'low' | 'medium' | 'high'
  confidence_score: number
  confidence_label: 'high' | 'moderate' | 'low' | 'insufficient'
  deterministic_title: string
  deterministic_summary: string
  recommended_action: unknown | null
  evidence_json: unknown
  source_references: unknown
  ranking_score: number | null
  status: 'candidate' | 'approved' | 'suppressed' | 'expired' | 'converted_to_card' | 'rejected'
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
  muted_categories: unknown
  reduced_categories: unknown
  last_preference_update_at: string | null
  created_at: string
  updated_at: string
}
export type ProactiveCard = {
  id: string
  user_id: string
  candidate_id: string
  health_date: string
  card_type: 'observation' | 'opportunity' | 'attention' | 'celebration' | 'data_gap'
  category: 'sleep' | 'stress' | 'recovery' | 'energy' | 'activity' | 'nutrition' | 'hydration' | 'mood' | 'consistency' | 'goal_progress' | 'readiness' | 'data_gap' | 'weekly_pattern' | 'coach_followup'
  severity: 'low' | 'medium' | 'high'
  title: string
  body: string
  primary_action_label: string | null
  primary_action_type: string | null
  primary_action_payload: unknown
  evidence_refs: unknown
  confidence_score: number | null
  confidence_label: 'high' | 'moderate' | 'low' | 'insufficient' | null
  status: 'active' | 'shown' | 'dismissed' | 'snoozed' | 'expired' | 'archived'
  source_engine_version: string
  copy_source: 'deterministic' | 'ai_rewrite'
  shown_at: string | null
  dismissed_at: string | null
  snoozed_until: string | null
  created_at: string
  updated_at: string
}
export type ProactiveCardFeedback = {
  id: string
  user_id: string
  card_id: string
  feedback_type: 'helpful' | 'not_helpful' | 'not_relevant' | 'too_frequent' | 'show_less_like_this'
  feedback_reason: string | null
  created_at: string
}
export type ProactiveCardEvent = {
  id: string
  user_id: string
  card_id: string
  event_type: 'created' | 'shown' | 'opened' | 'dismissed' | 'snoozed' | 'feedback_submitted' | 'coach_handoff_started'
  event_payload: unknown
  created_at: string
}
export type WeeklyReflectionStatus = 'generated' | 'viewed' | 'dismissed' | 'converted_to_coach' | 'expired'
export type WeeklyReflectionPayload = {
  headline: string
  weekAtGlance: {
    summary: string
    averageScore: number | null
    scoreDirection: 'up' | 'down' | 'stable' | 'insufficient_data'
    confidence: 'high' | 'moderate' | 'low'
  }
  whatChanged: Array<{ title: string; explanation: string; sourceReference: string }>
  whatSupportedYou: Array<{ title: string; explanation: string; sourceReference: string }>
  attentionAreas: Array<{ title: string; explanation: string; sourceReference: string }>
  nextWeekFocus: { title: string; detail: string }
  suggestedCoachPrompts: string[]
  confidenceNote: string | null
  sourceReferences: string[]
}
export type WeeklyReflection = {
  id: string
  user_id: string
  week_start_date: string
  week_end_date: string
  status: WeeklyReflectionStatus
  summary_payload: WeeklyReflectionPayload
  deterministic_metrics: unknown
  source_references: unknown
  context_envelope_id: string | null
  ai_execution_id: string | null
  viewed_at: string | null
  dismissed_at: string | null
  converted_to_coach_at: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> }
      health_profiles: { Row: HealthProfile; Insert: Omit<HealthProfile, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<HealthProfile, 'id' | 'created_at' | 'updated_at'>>; Update: Partial<HealthProfile> }
      user_goals: { Row: UserGoal; Insert: Omit<UserGoal, 'id' | 'created_at'> & Partial<Pick<UserGoal, 'id' | 'created_at'>>; Update: Partial<UserGoal> }
      user_preferences: { Row: UserPreferences; Insert: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<UserPreferences, 'id' | 'created_at' | 'updated_at'>>; Update: Partial<UserPreferences> }
      user_permissions: { Row: UserPermissions; Insert: Omit<UserPermissions, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<UserPermissions, 'id' | 'created_at' | 'updated_at'>>; Update: Partial<UserPermissions> }
      nuraa_scores: { Row: NuraaScore; Insert: Omit<NuraaScore, 'id' | 'created_at'> & Partial<Pick<NuraaScore, 'id' | 'created_at'>>; Update: Partial<NuraaScore> }
      daily_checkins: { Row: DailyCheckin; Insert: Omit<DailyCheckin, 'id' | 'created_at'> & Partial<Pick<DailyCheckin, 'id' | 'created_at'>>; Update: Partial<DailyCheckin> }
      health_signals: { Row: HealthSignalRow; Insert: Omit<HealthSignalRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<HealthSignalRow, 'id' | 'created_at' | 'updated_at'>>; Update: Partial<HealthSignalRow> }
      daily_briefs: { Row: DailyBriefRow; Insert: Omit<DailyBriefRow, 'id' | 'created_at' | 'updated_at' | 'source'> & Partial<Pick<DailyBriefRow, 'id' | 'created_at' | 'updated_at' | 'source'>>; Update: Partial<DailyBriefRow> }
      insight_events: { Row: InsightEvent; Insert: Omit<InsightEvent, 'id' | 'created_at'> & Partial<Pick<InsightEvent, 'id' | 'created_at'>>; Update: Partial<InsightEvent> }
      score_factors: { Row: ScoreFactor; Insert: Omit<ScoreFactor, 'id' | 'created_at'> & Partial<Pick<ScoreFactor, 'id' | 'created_at'>>; Update: Partial<ScoreFactor> }
      user_ai_preferences: { Row: UserAIPreferences; Insert: Omit<UserAIPreferences, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<UserAIPreferences, 'id' | 'created_at' | 'updated_at'>>; Update: Partial<UserAIPreferences> }
      coach_conversations: { Row: CoachConversation; Insert: Omit<CoachConversation, 'id' | 'created_at' | 'updated_at' | 'last_active_at' | 'status'> & Partial<Pick<CoachConversation, 'id' | 'created_at' | 'updated_at' | 'last_active_at' | 'status'>>; Update: Partial<CoachConversation> }
      coach_messages: { Row: CoachMessage; Insert: Omit<CoachMessage, 'id' | 'created_at'> & Partial<Pick<CoachMessage, 'id' | 'created_at'>>; Update: Partial<CoachMessage> }
      coach_feedback: { Row: CoachFeedback; Insert: Omit<CoachFeedback, 'id' | 'created_at'> & Partial<Pick<CoachFeedback, 'id' | 'created_at'>>; Update: Partial<CoachFeedback> }
      insight_candidates: { Row: InsightCandidate; Insert: Omit<InsightCandidate, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<InsightCandidate, 'id' | 'created_at' | 'updated_at'>>; Update: Partial<InsightCandidate> }
      proactive_guidance_preferences: { Row: ProactiveGuidancePreferences; Insert: Omit<ProactiveGuidancePreferences, 'created_at' | 'updated_at'> & Partial<Pick<ProactiveGuidancePreferences, 'created_at' | 'updated_at'>>; Update: Partial<ProactiveGuidancePreferences> }
      proactive_cards: { Row: ProactiveCard; Insert: Omit<ProactiveCard, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<ProactiveCard, 'id' | 'created_at' | 'updated_at'>>; Update: Partial<ProactiveCard> }
      proactive_card_feedback: { Row: ProactiveCardFeedback; Insert: Omit<ProactiveCardFeedback, 'id' | 'created_at'> & Partial<Pick<ProactiveCardFeedback, 'id' | 'created_at'>>; Update: Partial<ProactiveCardFeedback> }
      proactive_card_events: { Row: ProactiveCardEvent; Insert: Omit<ProactiveCardEvent, 'id' | 'created_at'> & Partial<Pick<ProactiveCardEvent, 'id' | 'created_at'>>; Update: Partial<ProactiveCardEvent> }
      weekly_reflections: { Row: WeeklyReflection; Insert: Omit<WeeklyReflection, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<WeeklyReflection, 'id' | 'created_at' | 'updated_at'>>; Update: Partial<WeeklyReflection> }
      subscriptions: { Row: { id: string; user_id: string; plan_name: string; status: string; created_at: string; updated_at: string }; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
  }
}
