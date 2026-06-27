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
export type NuraaScore = { id: string; user_id: string; score_date: string; total_score: number | null; readiness_category: string | null; score_reason: string | null; recommended_focus: string | null; created_at: string }
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
      subscriptions: { Row: { id: string; user_id: string; plan_name: string; status: string; created_at: string; updated_at: string }; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
  }
}
