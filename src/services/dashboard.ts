import { getSupabaseClient } from '@/lib/supabase'
import type { NuraaScore } from '@/types/database'

export async function getLatestScore(userId: string): Promise<NuraaScore | null> {
  const result = await getSupabaseClient().from('nuraa_scores').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1).maybeSingle()
  if (result.error) throw result.error
  return result.data
}
