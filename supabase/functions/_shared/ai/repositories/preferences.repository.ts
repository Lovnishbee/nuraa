import type { RuntimeSupabaseClient } from '../types.ts'

export async function getUserCoachingPreferences(client: RuntimeSupabaseClient, userId: string) {
  const result = await client.from('user_preferences').select('notification_preference').eq('user_id', userId).maybeSingle<{ notification_preference: string | null }>()
  if (result.error) return { coachingDetailLevel: 'balanced' as const, coachingTone: 'calm' as const }
  const preference = result.data?.notification_preference
  return {
    coachingDetailLevel: 'balanced' as const,
    coachingTone: preference === 'direct' ? 'direct' as const : 'calm' as const,
  }
}
