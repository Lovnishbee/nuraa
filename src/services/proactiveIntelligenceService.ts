import { invokeAuthenticatedFunction } from '@/services/supabaseFunction'
import type { ProactiveEngineInput, ProactiveEngineResponse } from '@/features/proactive/types'

export async function invokeProactiveEngine(input: ProactiveEngineInput): Promise<ProactiveEngineResponse> {
  return invokeAuthenticatedFunction<ProactiveEngineResponse>('proactive-engine', input)
}
