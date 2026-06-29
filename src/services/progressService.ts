import { getSupabaseClient } from '@/lib/supabase'
import { getLocalISODateWithOffset } from '@/lib/date'
import type { HealthSignalRow, InsightEvent, NuraaScore, ScoreFactor } from '@/types/database'
import { localIntelligenceProvider } from './intelligence/provider'

export type ProgressRange = '7d' | '30d'

export type ProgressSummary = {
  range: ProgressRange
  scores: NuraaScore[]
  signals: HealthSignalRow[]
  factors: ScoreFactor[]
  insights: InsightEvent[]
}

function startDateForRange(range: ProgressRange) {
  return getLocalISODateWithOffset(-(range === '7d' ? 6 : 29))
}

export async function getProgressSummary(userId: string, range: ProgressRange): Promise<ProgressSummary> {
  await localIntelligenceProvider.backfill(userId)
  const supabase = getSupabaseClient()
  const start = startDateForRange(range)
  const [scores, signals, factors, insights] = await Promise.all([
    supabase.from('nuraa_scores').select('*').eq('user_id', userId).gte('score_date', start).order('score_date', { ascending: true }),
    supabase.from('health_signals').select('*').eq('user_id', userId).gte('signal_date', start).order('signal_date', { ascending: true }),
    supabase.from('score_factors').select('*').eq('user_id', userId).gte('score_date', start).order('score_date', { ascending: true }),
    supabase.from('insight_events').select('*').eq('user_id', userId).gte('event_date', start).order('event_date', { ascending: false }).limit(12),
  ])
  if (scores.error || signals.error || factors.error || insights.error) throw scores.error ?? signals.error ?? factors.error ?? insights.error
  return { range, scores: scores.data ?? [], signals: signals.data ?? [], factors: factors.data ?? [], insights: insights.data ?? [] }
}
