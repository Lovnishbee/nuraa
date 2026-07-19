import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

function isRealSupabaseUrl(value: string | undefined) {
  if (!value || value === 'https://your-project.supabase.co') return false
  try {
    const parsed = new URL(value)
    const isHostedSupabase = parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co')
    const isLocalSupabase = parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
    return isHostedSupabase || isLocalSupabase
  } catch {
    return false
  }
}

function isRealPublishableKey(value: string | undefined) {
  return Boolean(value && value !== 'your-publishable-key')
}

export const isSupabaseConfigured = isRealSupabaseUrl(url) && isRealPublishableKey(key)

let client: SupabaseClient | undefined

export function getSupabaseClient() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.')
  client ??= createClient(url, key)
  return client
}
