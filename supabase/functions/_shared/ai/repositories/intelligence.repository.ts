import type { RuntimeDataSnapshot, RuntimeSupabaseClient } from '../types.ts'

export async function getRuntimeDataSnapshot(client: RuntimeSupabaseClient, userId: string): Promise<RuntimeDataSnapshot> {
  const [profile, scores, signal, brief, factors, insights, goals] = await Promise.all([
    client.from('profiles').select('id, timezone, full_name').eq('id', userId).maybeSingle<RuntimeDataSnapshot['profile']>(),
    client.from('nuraa_scores').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(2),
    client.from('health_signals').select('*').eq('user_id', userId).order('signal_date', { ascending: false }).limit(1).maybeSingle<Record<string, unknown>>(),
    client.from('daily_briefs').select('*').eq('user_id', userId).order('brief_date', { ascending: false }).limit(1).maybeSingle<RuntimeDataSnapshot['brief']>(),
    client.from('score_factors').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1).maybeSingle<Record<string, unknown>>(),
    client.from('insight_events').select('*').eq('user_id', userId).order('event_date', { ascending: false }).limit(6),
    client.from('user_goals').select('id, goal_type, goal_label, priority, status').eq('user_id', userId).eq('status', 'active').order('priority', { ascending: true }).limit(3),
  ])

  const firstError = profile.error ?? scores.error ?? signal.error ?? brief.error ?? factors.error ?? insights.error ?? goals.error
  if (firstError) throw new Error(firstError.message)
  const scoreRows = Array.isArray(scores.data) ? scores.data as Array<Record<string, unknown>> : []

  return {
    profile: profile.data,
    score: scoreRows[0] ?? null,
    previousScore: scoreRows[1] ?? null,
    signal: signal.data,
    brief: brief.data,
    factors: factors.data,
    insights: (insights.data ?? []) as Array<Record<string, unknown>>,
    goals: (goals.data ?? []) as Array<Record<string, unknown>>,
  }
}
