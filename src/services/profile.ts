import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type { HealthProfile, Profile, UserGoal, UserPermissions, UserPreferences } from '@/types/database'

export type ProfileBundle = { profile: Profile; healthProfile: HealthProfile | null; goals: UserGoal[]; preferences: UserPreferences | null; permissions: UserPermissions | null }
export type ProfileUpdateInput = {
  fullName: string
  phone?: string | null
  age?: number | null
  gender?: string | null
  locationCity?: string | null
  locationCountry?: string | null
  timezone?: string | null
  heightCm?: number | null
  weightKg?: number | null
  targetWeightKg?: number | null
  activityLevel?: string | null
  fitnessLevel?: string | null
  dietPreference?: string | null
  cuisinePreferences?: string[] | null
  dislikedFoods?: string[] | null
  workType?: string | null
  workSchedule?: string | null
  commuteMinutes?: number | null
  travelFrequency?: string | null
  goalLabels?: string[] | null
  medicalConditions?: string[] | null
  allergies?: string[] | null
  injuries?: string[] | null
  dietaryRestrictions?: string[] | null
}

export function buildProfileBootstrapPayload(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '',
  }
}

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

export async function getOrCreateProfileBundle(user: User): Promise<ProfileBundle> {
  try {
    return await getProfileBundle(user.id)
  } catch (error) {
    if (!isMissingRowError(error)) throw error
  }

  const result = await getSupabaseClient()
    .from('profiles')
    .insert(buildProfileBootstrapPayload(user))
    .select('*')
    .single()

  if (result.error) throw result.error
  return {
    profile: result.data as Profile,
    healthProfile: null,
    goals: [],
    preferences: null,
    permissions: null,
  }
}

export function buildProfileUpdatePayload(input: ProfileUpdateInput) {
  return {
    full_name: input.fullName.trim(),
    phone: normalizeText(input.phone),
    age: normalizeNumber(input.age),
    gender: normalizeText(input.gender),
    location_city: normalizeText(input.locationCity),
    location_country: normalizeText(input.locationCountry),
    timezone: normalizeText(input.timezone) ?? 'Asia/Kolkata',
  }
}

export function buildHealthProfileUpdatePayload(userId: string, input: ProfileUpdateInput) {
  const payload: {
    user_id: string
    height_cm: number | null
    weight_kg: number | null
    target_weight_kg: number | null
    activity_level: string | null
    fitness_level: string | null
    medical_conditions?: string[]
    allergies?: string[]
    injuries?: string[]
    dietary_restrictions?: string[]
  } = {
    user_id: userId,
    height_cm: normalizeNumber(input.heightCm),
    weight_kg: normalizeNumber(input.weightKg),
    target_weight_kg: normalizeNumber(input.targetWeightKg),
    activity_level: normalizeText(input.activityLevel),
    fitness_level: normalizeText(input.fitnessLevel),
  }

  if (input.medicalConditions !== undefined) payload.medical_conditions = normalizeTextArray(input.medicalConditions)
  if (input.allergies !== undefined) payload.allergies = normalizeTextArray(input.allergies)
  if (input.injuries !== undefined) payload.injuries = normalizeTextArray(input.injuries)
  if (input.dietaryRestrictions !== undefined) payload.dietary_restrictions = normalizeTextArray(input.dietaryRestrictions)

  return payload
}

export function buildUserPreferencesUpdatePayload(userId: string, input: ProfileUpdateInput) {
  return {
    user_id: userId,
    diet_preference: normalizeText(input.dietPreference),
    cuisine_preferences: normalizeTextArray(input.cuisinePreferences),
    disliked_foods: normalizeTextArray(input.dislikedFoods),
    work_type: normalizeText(input.workType),
    work_schedule: normalizeText(input.workSchedule),
    commute_minutes: normalizeNumber(input.commuteMinutes),
    travel_frequency: normalizeText(input.travelFrequency),
  }
}

export function buildUserGoalRows(userId: string, goalLabels: string[] | null | undefined) {
  return normalizeTextArray(goalLabels).map((goalLabel, index) => ({
    user_id: userId,
    goal_type: goalLabel.toLowerCase().replaceAll(/\s+/g, '_'),
    goal_label: goalLabel,
    priority: index + 1,
    status: 'active',
  }))
}

export async function updateProfileFoundation(userId: string, input: ProfileUpdateInput): Promise<ProfileBundle> {
  const supabase = getSupabaseClient()
  const [profileResult, healthResult, preferencesResult] = await Promise.all([
    supabase.from('profiles').update(buildProfileUpdatePayload(input)).eq('id', userId).select('*').single(),
    supabase.from('health_profiles').upsert(buildHealthProfileUpdatePayload(userId, input), { onConflict: 'user_id' }).select('*').single(),
    supabase.from('user_preferences').upsert(buildUserPreferencesUpdatePayload(userId, input), { onConflict: 'user_id' }).select('*').single(),
  ])

  if (profileResult.error || healthResult.error || preferencesResult.error) throw profileResult.error ?? healthResult.error ?? preferencesResult.error

  if (input.goalLabels) {
    const deletion = await supabase.from('user_goals').delete().eq('user_id', userId)
    if (deletion.error) throw deletion.error
    const goalRows = buildUserGoalRows(userId, input.goalLabels)
    if (goalRows.length) {
      const insertion = await supabase.from('user_goals').insert(goalRows)
      if (insertion.error) throw insertion.error
    }
  }

  const bundle = await getProfileBundle(userId)
  return {
    ...bundle,
    profile: profileResult.data as Profile,
    healthProfile: healthResult.data as HealthProfile,
    preferences: preferencesResult.data as UserPreferences,
  }
}

function isMissingRowError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === 'PGRST116'
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeTextArray(value: string[] | null | undefined) {
  return Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)))
}
