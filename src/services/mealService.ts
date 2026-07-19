import { getTodayInTimezone } from '@/lib/date'
import { getSupabaseClient } from '@/lib/supabase'
import type { MealLog, MealType } from '@/types/database'

export type MealLogInput = {
  mealDate?: string
  timezone?: string
  mealType: MealType
  mealName: string
  notes?: string
  calories?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
}

export function buildMealLogPayload(userId: string, input: MealLogInput) {
  return {
    user_id: userId,
    ...buildMealLogUpdatePayload(input),
  }
}

export function buildMealLogUpdatePayload(input: MealLogInput) {
  return {
    meal_date: input.mealDate || getTodayInTimezone(input.timezone),
    meal_type: input.mealType,
    meal_name: input.mealName.trim(),
    notes: input.notes?.trim() || null,
    calories: normalizeOptionalNumber(input.calories),
    protein_g: normalizeOptionalNumber(input.proteinG),
    carbs_g: normalizeOptionalNumber(input.carbsG),
    fat_g: normalizeOptionalNumber(input.fatG),
  }
}

export async function getMealLogs(userId: string, limit = 30): Promise<MealLog[]> {
  const result = await getSupabaseClient()
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .order('meal_date', { ascending: false })
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (result.error) throw toMealLogError(result.error)
  return (result.data ?? []) as MealLog[]
}

export async function saveMealLog(userId: string, input: MealLogInput): Promise<MealLog> {
  const result = await getSupabaseClient()
    .from('meal_logs')
    .insert(buildMealLogPayload(userId, input))
    .select('*')
    .single()

  if (result.error) throw toMealLogError(result.error)
  return result.data as MealLog
}

export async function updateMealLog(userId: string, mealId: string, input: MealLogInput): Promise<MealLog> {
  const result = await getSupabaseClient()
    .from('meal_logs')
    .update(buildMealLogUpdatePayload(input))
    .eq('user_id', userId)
    .eq('id', mealId)
    .select('*')
    .single()

  if (result.error) throw toMealLogError(result.error)
  return result.data as MealLog
}

export async function deleteMealLog(userId: string, mealId: string) {
  const result = await getSupabaseClient()
    .from('meal_logs')
    .delete()
    .eq('user_id', userId)
    .eq('id', mealId)

  if (result.error) throw toMealLogError(result.error)
}

function normalizeOptionalNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function toMealLogError(error: unknown) {
  const message = readSupabaseMessage(error)
  if (isMissingTableError(error, message)) {
    return new Error('Meal logging needs the latest database migration before it can save data.')
  }
  return new Error(message || 'Meal logging is temporarily unavailable.')
}

function readSupabaseMessage(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : ''
}

function isMissingTableError(error: unknown, message: string) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : null
  return code === '42P01' || message.includes('meal_logs') && (message.includes('does not exist') || message.includes('schema cache'))
}
