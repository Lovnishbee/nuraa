import { getSupabaseClient } from '@/lib/supabase'
import type { AIGatewayResponse, AIRequestInput } from '@/features/ai/types'

export async function invokeAIGateway(input: AIRequestInput): Promise<AIGatewayResponse> {
  const supabase = getSupabaseClient()
  const result = await supabase.functions.invoke<AIGatewayResponse>('ai-gateway', { body: input })
  if (result.error) throw result.error
  if (!result.data) throw new Error('AI gateway returned no data.')
  return result.data
}
