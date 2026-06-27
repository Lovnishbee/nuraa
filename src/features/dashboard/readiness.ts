import type { DailyCheckin, NuraaScore } from '@/types/database'

export type DashboardReadinessView = {
  score: number
  category: string
  reason: string
  note: string
  hasBaseline: boolean
  checkinCountLabel: string
}

export function getDashboardReadiness(score: NuraaScore | null | undefined, latestCheckin: DailyCheckin | null | undefined, weeklyCheckinCount = 0): DashboardReadinessView {
  if (score?.total_score !== null && score?.total_score !== undefined) {
    return {
      score: score.total_score,
      category: score.readiness_category || 'Readiness active',
      reason: score.score_reason || 'Your readiness baseline is taking shape from the signals you share.',
      note: score.recommended_focus || 'Your score gets smarter as you log sleep, mood, meals, and movement.',
      hasBaseline: true,
      checkinCountLabel: weeklyCheckinCount === 1 ? '1 check-in recorded' : `${weeklyCheckinCount} check-ins recorded`,
    }
  }

  if (latestCheckin) {
    const energy = latestCheckin.energy_level ?? 3
    const sleep = latestCheckin.sleep_quality ?? 3
    const stress = latestCheckin.stress_level ?? 3
    const deterministicScore = Math.max(45, Math.min(82, Math.round(52 + energy * 4 + sleep * 4 - stress * 2)))

    return {
      score: deterministicScore,
      category: 'Baseline started',
      reason: 'Your first daily signal has been captured. Keep checking in to help Nuraa understand your normal rhythm.',
      note: weeklyCheckinCount === 1 ? '1 check-in recorded' : `${Math.max(weeklyCheckinCount, 1)} check-ins recorded`,
      hasBaseline: true,
      checkinCountLabel: weeklyCheckinCount === 1 ? '1 check-in recorded' : `${Math.max(weeklyCheckinCount, 1)} check-ins recorded`,
    }
  }

  return {
    score: 0,
    category: 'Setting up your readiness baseline',
    reason: 'Complete your first daily check-in to begin building your Nuraa Score.',
    note: 'Your score gets smarter as you log sleep, mood, meals, and movement.',
    hasBaseline: false,
    checkinCountLabel: 'Ready after a few check-ins',
  }
}
