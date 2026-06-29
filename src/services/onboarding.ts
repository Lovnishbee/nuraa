import { getSupabaseClient } from '@/lib/supabase'
import { getTodayInTimezone } from '@/lib/date'
import type { HealthProfile, UserPermissions, UserPreferences } from '@/types/database'

type UpdatableProfile = { full_name?: string; age?: number; gender?: string }
export async function saveBasicDetails(userId: string, profile: UpdatableProfile, health: Pick<HealthProfile, 'height_cm' | 'weight_kg'>) {
  const supabase = getSupabaseClient()
  const [profileResult, healthResult] = await Promise.all([
    supabase.from('profiles').update(profile).eq('id', userId),
    supabase.from('health_profiles').upsert({ user_id: userId, ...health }, { onConflict: 'user_id' }),
  ])
  if (profileResult.error || healthResult.error) throw profileResult.error ?? healthResult.error
}

export async function saveGoals(userId: string, goals: string[]) {
  const supabase = getSupabaseClient()
  const deletion = await supabase.from('user_goals').delete().eq('user_id', userId)
  if (deletion.error) throw deletion.error
  if (!goals.length) return
  const result = await supabase.from('user_goals').insert(goals.map((goal_label, index) => ({ user_id: userId, goal_type: goal_label.toLowerCase().replaceAll(' ', '_'), goal_label, priority: index + 1 })))
  if (result.error) throw result.error
}

type PreferencesInput = Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { allergies?: string[] }
export async function savePreferences(userId: string, input: PreferencesInput) {
  const { allergies, ...preferences } = input
  const supabase = getSupabaseClient()
  const result = await supabase.from('user_preferences').upsert({ user_id: userId, ...preferences }, { onConflict: 'user_id' })
  if (result.error) throw result.error
  if (allergies) await saveMedical(userId, [], allergies)
}

export async function saveMedical(userId: string, medical_conditions: string[], allergies: string[]) {
  const result = await getSupabaseClient().from('health_profiles').upsert({ user_id: userId, medical_conditions, allergies }, { onConflict: 'user_id' })
  if (result.error) throw result.error
}

export async function savePermissions(userId: string, permissions: Partial<Omit<UserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
  const result = await getSupabaseClient().from('user_permissions').upsert({ user_id: userId, ...permissions }, { onConflict: 'user_id' })
  if (result.error) throw result.error
}

export async function completeOnboarding(userId: string) {
  const supabase = getSupabaseClient()
  const [profile, subscription, score] = await Promise.all([
    supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId),
    supabase.from('subscriptions').upsert({ user_id: userId, plan_name: 'free', status: 'active' }, { onConflict: 'user_id' }),
    supabase.from('nuraa_scores').upsert({ user_id: userId, score_date: getTodayInTimezone(), total_score: 0, readiness_category: 'Setting up', score_reason: 'Complete your first daily check-in to begin your readiness baseline.', recommended_focus: 'Start with a check-in' }, { onConflict: 'user_id,score_date' }),
  ])
  if (profile.error || subscription.error || score.error) throw profile.error ?? subscription.error ?? score.error
}
