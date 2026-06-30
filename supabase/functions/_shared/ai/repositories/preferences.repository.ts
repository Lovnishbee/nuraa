import type { RuntimeSupabaseClient } from '../types.ts'

export async function getUserCoachingPreferences(client: RuntimeSupabaseClient, userId: string) {
  const aiPreferences = await client.from('user_ai_preferences').select('response_detail').eq('user_id', userId).maybeSingle<{ response_detail: 'concise' | 'balanced' | 'detailed' | null }>()
  const appPreferences = await client.from('user_preferences').select('notification_preference').eq('user_id', userId).maybeSingle<{ notification_preference: string | null }>()
  const preference = appPreferences.data?.notification_preference
  return {
    coachingDetailLevel: aiPreferences.data?.response_detail ?? 'balanced' as const,
    coachingTone: preference === 'direct' ? 'direct' as const : 'calm' as const,
  }
}
