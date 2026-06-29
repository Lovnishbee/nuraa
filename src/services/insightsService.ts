import { getSupabaseClient } from '@/lib/supabase'
import type { DailyBriefRow, HealthSignalRow, InsightEvent, NuraaScore, ScoreFactor } from '@/types/database'
import { backfillMissingIntelligenceForUser } from './intelligenceService'

export type InsightsSummary = {
  brief: DailyBriefRow | null
  score: NuraaScore | null
  signal: HealthSignalRow | null
  factors: ScoreFactor | null
  insights: InsightEvent[]
}

export async function getInsightsSummary(userId: string): Promise<InsightsSummary> {
  await backfillMissingIntelligenceForUser(userId)
  const supabase = getSupabaseClient()
  const [brief, score, signal, factors, insights] = await Promise.all([
    supabase.from('daily_briefs').select('*').eq('user_id', userId).order('brief_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('nuraa_scores').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('health_signals').select('*').eq('user_id', userId).order('signal_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('score_factors').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('insight_events').select('*').eq('user_id', userId).order('event_date', { ascending: false }).order('created_at', { ascending: false }).limit(12),
  ])
  if (brief.error || score.error || signal.error || factors.error || insights.error) throw brief.error ?? score.error ?? signal.error ?? factors.error ?? insights.error
  return { brief: brief.data, score: score.data, signal: signal.data, factors: factors.data, insights: insights.data ?? [] }
}
