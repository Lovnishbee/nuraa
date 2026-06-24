import { useEffect } from 'react'
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser)
  const setReady = useAuthStore((state) => state.setReady)
  useEffect(() => {
    if (!isSupabaseConfigured) { setReady(true); return }
    const supabase = getSupabaseClient()
    void supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [setReady, setUser])
  return <>{children}</>
}
