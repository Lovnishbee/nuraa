import { getSupabaseClient } from '@/lib/supabase'
import type { DailyCheckin, NuraaScore } from '@/types/database'

export async function getLatestScore(userId: string): Promise<NuraaScore | null> {
  const result = await getSupabaseClient().from('nuraa_scores').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1).maybeSingle()
  if (result.error) throw result.error
  return result.data
}

export type DashboardSummary = {
  score: NuraaScore | null
  latestCheckin: DailyCheckin | null
  weeklyCheckins: DailyCheckin[]
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const supabase = getSupabaseClient()
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)

  const [score, latestCheckin, weeklyCheckins] = await Promise.all([
    supabase.from('nuraa_scores').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('daily_checkins').select('*').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('daily_checkins').select('*').eq('user_id', userId).gte('checkin_date', sevenDaysAgo.toISOString().slice(0, 10)).order('checkin_date', { ascending: true }),
  ])

  if (score.error || latestCheckin.error || weeklyCheckins.error) throw score.error ?? latestCheckin.error ?? weeklyCheckins.error

  return {
    score: score.data,
    latestCheckin: latestCheckin.data,
    weeklyCheckins: weeklyCheckins.data ?? [],
  }
}
