import { getSupabaseClient } from '@/lib/supabase'
import { invokeAuthenticatedFunction } from '@/services/supabaseFunction'
import type { AIGatewayResponse, AIInternalAccessStatus, AIRequestInput } from '@/features/ai/types'

export async function invokeAIGateway(input: AIRequestInput): Promise<AIGatewayResponse> {
  return invokeAuthenticatedFunction<AIGatewayResponse>('ai-gateway', input)
}

export async function getAIInternalAccessStatus(): Promise<AIInternalAccessStatus> {
  const supabase = getSupabaseClient()
  const userResult = await supabase.auth.getUser()
  const userId = userResult.data.user?.id
  if (userResult.error || !userId) return { enabled: false, consentGranted: false }

  const result = await supabase
    .from('ai_internal_testers')
    .select('enabled, consent_granted')
    .eq('user_id', userId)
    .maybeSingle<{ enabled: boolean; consent_granted: boolean }>()

  if (result.error || !result.data) return { enabled: false, consentGranted: false }
  return { enabled: Boolean(result.data.enabled), consentGranted: Boolean(result.data.consent_granted) }
}
