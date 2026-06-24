import { getSupabaseClient } from '@/lib/supabase'
import type { HealthProfile, Profile, UserGoal, UserPermissions, UserPreferences } from '@/types/database'

export type ProfileBundle = { profile: Profile; healthProfile: HealthProfile | null; goals: UserGoal[]; preferences: UserPreferences | null; permissions: UserPermissions | null }

export async function getProfileBundle(userId: string): Promise<ProfileBundle> {
  const supabase = getSupabaseClient()
  const [profile, healthProfile, goals, preferences, permissions] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('health_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_goals').select('*').eq('user_id', userId).order('priority'),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_permissions').select('*').eq('user_id', userId).maybeSingle(),
  ])
  if (profile.error) throw profile.error
  if (healthProfile.error || goals.error || preferences.error || permissions.error) throw healthProfile.error ?? goals.error ?? preferences.error ?? permissions.error
  return { profile: profile.data, healthProfile: healthProfile.data, goals: goals.data, preferences: preferences.data, permissions: permissions.data }
}
