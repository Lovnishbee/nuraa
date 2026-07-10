import { getSupabaseClient } from '@/lib/supabase'
import type { ProactiveEngineInput, ProactiveEngineResponse } from '@/features/proactive/types'

export async function invokeProactiveEngine(input: ProactiveEngineInput): Promise<ProactiveEngineResponse> {
  const result = await getSupabaseClient().functions.invoke<ProactiveEngineResponse>('proactive-engine', { body: input })
  if (result.error) throw result.error
  if (!result.data) throw new Error('Proactive engine returned no data.')
  return result.data
}
