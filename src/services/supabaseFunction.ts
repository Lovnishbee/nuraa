import { getSupabaseClient } from '@/lib/supabase'

type FunctionBody = Record<string, unknown>

export async function invokeAuthenticatedFunction<TResponse>(functionName: string, body: FunctionBody): Promise<TResponse> {
  const supabase = getSupabaseClient()
  const sessionResult = await supabase.auth.getSession()
  const accessToken = sessionResult.data.session?.access_token
  if (sessionResult.error || !accessToken) throw new Error('Authentication required.')

  const result = await supabase.functions.invoke<TResponse>(functionName, {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (result.error) throw result.error
  if (!result.data) throw new Error(`${functionName} returned no data.`)
  return result.data
}
