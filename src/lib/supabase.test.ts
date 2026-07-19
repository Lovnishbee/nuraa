import { afterEach, describe, expect, it, vi } from 'vitest'

async function importSupabaseModule() {
  vi.resetModules()
  return import('./supabase')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('Supabase client configuration', () => {
  it('treats placeholder environment values as unconfigured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://your-project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'your-publishable-key')

    const { getSupabaseClient, isSupabaseConfigured } = await importSupabaseModule()

    expect(isSupabaseConfigured).toBe(false)
    expect(() => getSupabaseClient()).toThrow(/Supabase is not configured/i)
  })

  it('allows local Supabase development URLs', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'local-anon-key')

    const { isSupabaseConfigured } = await importSupabaseModule()

    expect(isSupabaseConfigured).toBe(true)
  })
})
