import { getTodayInTimezone } from '@/lib/date'
import { getSupabaseClient } from '@/lib/supabase'
import type { WorkoutActivityType, WorkoutIntensity, WorkoutLog } from '@/types/database'

export type WorkoutLogInput = {
  workoutDate?: string
  timezone?: string
  activityType: WorkoutActivityType
  title: string
  durationMinutes: number
  intensity: WorkoutIntensity
  caloriesBurned?: number | null
  notes?: string
}

export function buildWorkoutLogPayload(userId: string, input: WorkoutLogInput) {
  return {
    user_id: userId,
    ...buildWorkoutLogUpdatePayload(input),
  }
}

export function buildWorkoutLogUpdatePayload(input: WorkoutLogInput) {
  return {
    workout_date: input.workoutDate || getTodayInTimezone(input.timezone),
    activity_type: input.activityType,
    title: input.title.trim(),
    duration_minutes: input.durationMinutes,
    intensity: input.intensity,
    calories_burned: normalizeOptionalNumber(input.caloriesBurned),
    notes: input.notes?.trim() || null,
  }
}

export async function getWorkoutLogs(userId: string, limit = 30): Promise<WorkoutLog[]> {
  const result = await getSupabaseClient()
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .order('workout_date', { ascending: false })
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (result.error) throw toWorkoutLogError(result.error)
  return (result.data ?? []) as WorkoutLog[]
}

export async function saveWorkoutLog(userId: string, input: WorkoutLogInput): Promise<WorkoutLog> {
  const result = await getSupabaseClient()
    .from('workout_logs')
    .insert(buildWorkoutLogPayload(userId, input))
    .select('*')
    .single()

  if (result.error) throw toWorkoutLogError(result.error)
  return result.data as WorkoutLog
}

export async function updateWorkoutLog(userId: string, workoutId: string, input: WorkoutLogInput): Promise<WorkoutLog> {
  const result = await getSupabaseClient()
    .from('workout_logs')
    .update(buildWorkoutLogUpdatePayload(input))
    .eq('user_id', userId)
    .eq('id', workoutId)
    .select('*')
    .single()

  if (result.error) throw toWorkoutLogError(result.error)
  return result.data as WorkoutLog
}

export async function deleteWorkoutLog(userId: string, workoutId: string) {
  const result = await getSupabaseClient()
    .from('workout_logs')
    .delete()
    .eq('user_id', userId)
    .eq('id', workoutId)

  if (result.error) throw toWorkoutLogError(result.error)
}

function normalizeOptionalNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function toWorkoutLogError(error: unknown) {
  const message = readSupabaseMessage(error)
  if (isMissingTableError(error, message)) {
    return new Error('Workout logging needs the latest database migration before it can save data.')
  }
  return new Error(message || 'Workout logging is temporarily unavailable.')
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
  return code === '42P01' || message.includes('workout_logs') && (message.includes('does not exist') || message.includes('schema cache'))
}
