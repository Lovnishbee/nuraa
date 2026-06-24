import { getSupabaseClient } from '@/lib/supabase'

export async function registerWithEmail(fullName: string, email: string, password: string) {
  return getSupabaseClient().auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/login` } })
}

export async function loginWithEmail(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email, password })
}

export async function logout() { return getSupabaseClient().auth.signOut() }
