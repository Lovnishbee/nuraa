import { getSupabaseClient } from '@/lib/supabase'
import { getTodayInTimezone } from '@/lib/date'
import type { DailyCheckin } from '@/types/database'

export type DailyCheckInInput = {
  mood: string
  energyLevel: number
  sleepQuality: number
  soreness: number
  stressLevel: number
  motivation: number
  sleepHours?: number
  reflection?: string
}

export function buildCheckInNotes(input: Pick<DailyCheckInInput, 'soreness' | 'motivation' | 'reflection'>) {
  return JSON.stringify({
    body_soreness: input.soreness,
    motivation_level: input.motivation,
    reflection: input.reflection?.trim() || null,
  })
}

export function parseCheckInNotes(notes: string | null) {
  if (!notes) return { body_soreness: null, motivation_level: null, reflection: null }
  try {
    const parsed = JSON.parse(notes) as { body_soreness?: number; motivation_level?: number; reflection?: string | null }
    return {
      body_soreness: parsed.body_soreness ?? null,
      motivation_level: parsed.motivation_level ?? null,
      reflection: parsed.reflection ?? null,
    }
  } catch {
    return { body_soreness: null, motivation_level: null, reflection: notes }
  }
}

export async function saveDailyCheckIn(userId: string, input: DailyCheckInInput): Promise<DailyCheckin> {
  const checkin_date = getTodayInTimezone()
  const supabase = getSupabaseClient()
  const payload = {
    user_id: userId,
    checkin_date,
    mood: input.mood,
    energy_level: input.energyLevel,
    stress_level: input.stressLevel,
    sleep_quality: input.sleepQuality,
    sleep_hours: input.sleepHours ?? null,
    notes: buildCheckInNotes(input),
  }

  const existing = await supabase
    .from('daily_checkins')
    .select('id')
    .eq('user_id', userId)
    .eq('checkin_date', checkin_date)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.error) throw existing.error

  const result = existing.data
    ? await supabase
      .from('daily_checkins')
      .update(payload)
      .eq('id', existing.data.id)
      .select('*')
      .single()
    : await supabase
    .from('daily_checkins')
      .insert(payload)
    .select('*')
    .single()

  if (result.error) throw result.error
  return result.data
}
