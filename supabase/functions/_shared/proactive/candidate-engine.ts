import { getTimeOfDay } from '../ai/date.ts'
import { calculateConfidence } from './confidence.ts'
import { applyFatiguePolicy } from './fatigue-policy.ts'
import { rankCandidates } from './ranking.ts'
import { PROACTIVE_ENGINE_VERSION, type CandidateCategory, type CandidateSeverity, type CandidateType, type ConfidenceBreakdown, type GeneratedCandidate, type ProactiveGenerationResult, type ProactiveSnapshot, type RecommendedAction, type SourceReference } from './types.ts'

export function generateProactiveCandidates(snapshot: ProactiveSnapshot): ProactiveGenerationResult {
  const generated = [
    sleepStabilityObservation(snapshot),
    sleepDeclineAttention(snapshot),
    stressEnergyOpportunity(snapshot),
    recoveryDipAttention(snapshot),
    hydrationConsistencyCelebration(snapshot),
    activityRecoveryImbalanceOpportunity(snapshot),
    goalProgressCelebration(snapshot),
    readinessChangeObservation(snapshot),
    lowConfidenceDataGap(snapshot),
    repeatedEveningStressOpportunity(snapshot),
  ].filter((candidate): candidate is GeneratedCandidate => Boolean(candidate))

  const ranked = rankCandidates(generated, snapshot)
  const candidates = applyFatiguePolicy(ranked, snapshot)
  return {
    status: 'completed',
    healthDate: snapshot.healthDate,
    generated: generated.length,
    approved: candidates.filter((candidate) => candidate.status === 'approved').length,
    suppressed: candidates.filter((candidate) => candidate.status === 'suppressed').length,
    candidates,
  }
}

function sleepStabilityObservation(snapshot: ProactiveSnapshot) {
  const recent = recentSignals(snapshot)
  const sleepScores = values(recent.map((signal) => signal.sleep_score))
  const sleepQuality = values(recent.map((signal) => signal.sleep_quality))
  if (sleepScores.length < 4 || sleepQuality.length < 4) return null
  if (variance(sleepScores) > 45 || average(sleepQuality) < 3) return null
  if (hasSleepAttentionCandidate(snapshot)) return null
  const confidence = confidenceFor(snapshot, sleepScores.length, 7, 0.78, 1)
  if (!eligibleConfidence(confidence, false)) return null
  return buildCandidate(snapshot, {
    type: 'observation',
    category: 'sleep',
    severity: 'low',
    confidence,
    title: 'Your sleep has been steadier this week',
    summary: 'Your recent sleep signals have been more consistent, which can help Nuraa keep today’s guidance grounded.',
    action: { title: 'Keep your sleep window steady', detail: 'Try to protect the same wind-down rhythm tonight.' },
    evidence: evidence(snapshot, [
      ['health_signals', recent[0]?.id, 'Sleep signals', 'Recent sleep quality and sleep score have stayed in a tighter range.'],
      ['score_factors', latest(snapshot.scoreFactors)?.id, 'Score factors', 'Sleep is available as a readiness factor for this window.'],
    ]),
    limitations: confidence.limitations,
  })
}

function sleepDeclineAttention(snapshot: ProactiveSnapshot) {
  const current = currentFactors(snapshot)
  const previous = previousFactors(snapshot)
  const sleepScores = values(current.map((factor) => factor.sleep_score))
  if (sleepScores.length < 3) return null
  const declinedConsecutive = hasConsecutiveDecline(current.map((factor) => factor.sleep_score))
  const previousAverage = average(values(previous.map((factor) => factor.sleep_score)))
  const currentAverage = average(sleepScores)
  const dropped = previousAverage > 0 && currentAverage <= previousAverage * 0.8
  if (!declinedConsecutive && !dropped) return null
  const confidence = confidenceFor(snapshot, sleepScores.length, 7, declinedConsecutive && dropped ? 0.9 : 0.72, 1)
  if (!eligibleConfidence(confidence, false)) return null
  return buildCandidate(snapshot, {
    type: 'attention',
    category: 'sleep',
    severity: 'medium',
    confidence,
    title: 'Sleep may be worth protecting tonight',
    summary: 'Your sleep signals have moved lower across recent available days. This is a pattern to notice, not a diagnosis.',
    action: { title: 'Keep tonight lighter', detail: 'A calmer evening and consistent bedtime may support tomorrow’s readiness.' },
    evidence: evidence(snapshot, [
      ['score_factors', latest(current)?.id, 'Sleep factor', 'Recent sleep factor values are lower than your recent baseline.'],
      ['health_signals', latest(recentSignals(snapshot))?.id, 'Check-in signals', 'Recent sleep quality is available for this pattern.'],
    ]),
    limitations: confidence.limitations,
  })
}

function stressEnergyOpportunity(snapshot: ProactiveSnapshot) {
  const paired = recentSignals(snapshot).filter((signal) => signal.stress_level !== null && signal.energy_level !== null)
  const matching = paired.filter((signal) => Number(signal.stress_level) >= 4 && Number(signal.energy_level) <= 2)
  if (matching.length < 2) return null
  const confidence = confidenceFor(snapshot, matching.length, 4, 0.82, 1)
  if (!eligibleConfidence(confidence, false)) return null
  return buildCandidate(snapshot, {
    type: 'opportunity',
    category: 'stress',
    severity: 'medium',
    confidence,
    title: 'Stress and lower energy often coincide for you',
    summary: 'On recent high-stress check-ins, lower energy appears linked with the same days. Nuraa is treating this as a pattern, not a cause.',
    action: { title: 'Add one lower-friction reset', detail: 'A short walk, breathing break, or lighter evening plan may help protect energy.' },
    evidence: evidence(snapshot, [
      ['health_signals', matching[0]?.id, 'Stress and energy', 'At least two recent check-ins pair higher stress with lower energy.'],
      ['daily_briefs', latest(snapshot.dailyBriefs)?.id, 'Daily brief', 'Your recent guidance has enough context for a gentle action.'],
    ]),
    limitations: confidence.limitations,
  })
}

function recoveryDipAttention(snapshot: ProactiveSnapshot) {
  const current = currentFactors(snapshot)
  const recovery = values(current.map((factor) => factor.recovery_score))
  const activity = values(current.map((factor) => factor.activity_score))
  if (recovery.length < 2) return null
  const previousRecoveryAverage = average(values(previousFactors(snapshot).map((factor) => factor.recovery_score)))
  const lowThreeDays = recovery.slice(0, 3).length >= 3 && recovery.slice(0, 3).every((score) => previousRecoveryAverage > 0 && score < previousRecoveryAverage)
  const lowTwoDays = recovery.slice(0, 2).length >= 2 && recovery.slice(0, 2).every((score) => score < 55)
  if ((!lowThreeDays && !lowTwoDays) || average(activity) < 60) return null
  const confidence = confidenceFor(snapshot, recovery.length, 5, 0.76, 1)
  if (!eligibleConfidence(confidence, false)) return null
  return buildCandidate(snapshot, {
    type: 'attention',
    category: 'recovery',
    severity: 'medium',
    confidence,
    title: 'Recovery looks quieter than usual',
    summary: 'Your recovery factor has been below its recent baseline while activity is still present. A lighter pace may be worth considering.',
    action: { title: 'Protect recovery today', detail: 'Keep movement easy and give sleep more priority tonight.' },
    evidence: evidence(snapshot, [
      ['score_factors', latest(current)?.id, 'Recovery factor', 'Recent recovery scores are below your recent baseline.'],
      ['score_factors', latest(current)?.id, 'Activity factor', 'Activity remains moderate enough to consider pacing.' ],
    ]),
    limitations: confidence.limitations,
  })
}

function hydrationConsistencyCelebration(snapshot: ProactiveSnapshot) {
  const current = currentFactors(snapshot)
  const previous = previousFactors(snapshot)
  const hydration = values(current.map((factor) => factor.hydration_score))
  if (hydration.length < 3) return null
  const improved = average(hydration) > average(values(previous.map((factor) => factor.hydration_score))) + 5
  const checkinImproved = recentSignals(snapshot).length >= Math.min(4, previous.length + 1)
  if (!improved && !checkinImproved) return null
  const confidence = confidenceFor(snapshot, hydration.length, 7, improved ? 0.8 : 0.62, 0.9)
  if (!eligibleConfidence(confidence, false)) return null
  return buildCandidate(snapshot, {
    type: 'celebration',
    category: 'hydration',
    severity: 'low',
    confidence,
    title: 'Your hydration rhythm is looking more consistent',
    summary: 'Recent hydration signals are steadier than before. This is a useful support signal for daily readiness.',
    action: { title: 'Keep the rhythm simple', detail: 'Repeat the same water cue that has been working for you.' },
    evidence: evidence(snapshot, [
      ['score_factors', latest(current)?.id, 'Hydration factor', 'Hydration has improved or stayed more consistent recently.'],
      ['health_signals', latest(recentSignals(snapshot))?.id, 'Recent signals', 'Nuraa has enough recent signal coverage to notice this.' ],
    ]),
    limitations: confidence.limitations,
  })
}

function activityRecoveryImbalanceOpportunity(snapshot: ProactiveSnapshot) {
  const current = currentFactors(snapshot)
  if (current.length < 2) return null
  const activity = values(current.map((factor) => factor.activity_score))
  const recovery = values(current.map((factor) => factor.recovery_score))
  const previousActivity = average(values(previousFactors(snapshot).map((factor) => factor.activity_score)))
  const activityUp = average(activity) >= previousActivity + 7
  const recoveryDown = hasConsecutiveDecline(current.map((factor) => factor.recovery_score)) || average(recovery) < 58
  if (!activityUp || !recoveryDown) return null
  const confidence = confidenceFor(snapshot, Math.min(activity.length, recovery.length), 4, 0.74, 1)
  if (!eligibleConfidence(confidence, false)) return null
  return buildCandidate(snapshot, {
    type: 'opportunity',
    category: 'activity',
    severity: 'medium',
    confidence,
    title: 'Activity is up while recovery is softer',
    summary: 'Recent activity has increased while recovery has not risen with it. That may be worth pacing gently today.',
    action: { title: 'Choose easier movement', detail: 'Keep intensity lower and focus on sleep protection.' },
    evidence: evidence(snapshot, [
      ['score_factors', latest(current)?.id, 'Activity and recovery', 'Activity and recovery factors are moving in different directions.'],
    ]),
    limitations: confidence.limitations,
  })
}

function goalProgressCelebration(snapshot: ProactiveSnapshot) {
  const activeGoals = snapshot.goals.filter((goal) => goal.status === 'active')
  if (activeGoals.length === 0) return null
  const recent = currentFactors(snapshot)
  const improvedDays = recent.filter((factor) => Number(factor.sleep_score ?? 0) >= 70 || Number(factor.activity_score ?? 0) >= 70 || Number(factor.nutrition_score ?? 0) >= 70).length
  if (improvedDays < 3) return null
  const confidence = confidenceFor(snapshot, improvedDays, 5, 0.68, 0.85)
  if (!eligibleConfidence(confidence, false)) return null
  return buildCandidate(snapshot, {
    type: 'celebration',
    category: 'goal_progress',
    severity: 'low',
    confidence,
    title: 'Your recent signals support your goals',
    summary: 'Several recent behavior signals line up with your active health goals. Nuraa is counting this as grounded progress, not perfection.',
    action: { title: 'Repeat the easiest win', detail: 'Keep one supportive habit steady today.' },
    evidence: evidence(snapshot, [
      ['user_goals', activeGoals[0]?.id, 'Active goal', 'You have an active goal connected to recent behavior signals.'],
      ['score_factors', latest(recent)?.id, 'Recent factors', 'At least three recent days include a supportive factor signal.'],
    ]),
    limitations: confidence.limitations,
  })
}

function readinessChangeObservation(snapshot: ProactiveSnapshot) {
  const [latestScore, previousScore] = snapshot.scores
  if (!latestScore || !previousScore || latestScore.total_score === null || previousScore.total_score === null) return null
  const scoreDelta = latestScore.total_score - previousScore.total_score
  const categoryChanged = latestScore.readiness_category !== previousScore.readiness_category
  if (Math.abs(scoreDelta) < 10 && !categoryChanged) return null
  if ((latestScore.confidence ?? 0) < 55) return null
  const confidence = confidenceFor(snapshot, 2, 2, categoryChanged ? 0.85 : 0.72, 1)
  if (!eligibleConfidence(confidence, false)) return null
  const direction = scoreDelta >= 0 ? 'up' : 'down'
  return buildCandidate(snapshot, {
    type: 'observation',
    category: 'readiness',
    severity: Math.abs(scoreDelta) >= 15 ? 'medium' : 'low',
    confidence,
    title: `Your readiness moved ${direction}`,
    summary: 'Your Nuraa Score or readiness category changed compared with the prior available day. The factors explain the movement better than a single cause.',
    action: { title: 'Review the factor behind it', detail: latestScore.limiting_factor ? `Start with ${latestScore.limiting_factor}.` : 'Start with the factor that changed most.' },
    evidence: evidence(snapshot, [
      ['nuraa_scores', latestScore.id, 'Nuraa Score', 'Your latest score changed from the previous available score.'],
      ['score_factors', latest(snapshot.scoreFactors)?.id, 'Score factors', 'Current readiness factors provide the safest explanation.'],
    ]),
    limitations: confidence.limitations,
  })
}

function lowConfidenceDataGap(snapshot: ProactiveSnapshot) {
  const latestScore = latest(snapshot.scores)
  const latestSignal = latest(snapshot.healthSignals)
  const noCheckinRecently = !latestSignal || daysBetween(latestSignal.signal_date, snapshot.healthDate) >= 2
  const lowConfidence = (latestScore?.confidence ?? 100) < 55 || (latestSignal?.overall_signal_confidence ?? 100) < 55
  if (!noCheckinRecently && !lowConfidence) return null
  const confidence = calculateConfidence({
    validDataPoints: latestSignal ? 1 : 0,
    expectedDataPoints: 3,
    consistency: 0.45,
    latestAgeDays: latestSignal ? daysBetween(latestSignal.signal_date, snapshot.healthDate) : 7,
    sourceQuality: 0.8,
    limitations: ['Nuraa needs more recent check-ins to guide confidently'],
  })
  return buildCandidate(snapshot, {
    type: 'data_gap',
    category: 'data_gap',
    severity: 'low',
    confidence: { ...confidence, label: confidence.label === 'insufficient' ? 'low' : confidence.label },
    title: 'A quick check-in would sharpen today’s guidance',
    summary: 'Nuraa has limited recent signal coverage, so today’s proactive guidance should stay light.',
    action: { title: 'Complete a short check-in', detail: 'Sleep, stress, and energy are enough to improve confidence.' },
    evidence: evidence(snapshot, [
      ['health_signals', latestSignal?.id, 'Recent signals', 'Signal coverage is limited or lower confidence.'],
      ['nuraa_scores', latestScore?.id, 'Score confidence', 'Current readiness confidence is lower than ideal.'],
    ]),
    limitations: confidence.limitations,
  })
}

function repeatedEveningStressOpportunity(snapshot: ProactiveSnapshot) {
  const eveningHighStress = snapshot.dailyCheckins.filter((checkin) => getTimeOfDay(snapshot.timezone, new Date(checkin.created_at)) === 'evening' && Number(checkin.stress_level ?? 0) >= 4)
  if (eveningHighStress.length < 3) return null
  const pairedLowerNextDay = eveningHighStress.filter((checkin) => {
    const nextDaySignal = snapshot.healthSignals.find((signal) => signal.signal_date > checkin.checkin_date)
    return Number(nextDaySignal?.energy_level ?? 5) <= 2 || Number(nextDaySignal?.sleep_quality ?? 5) <= 2
  })
  if (pairedLowerNextDay.length < 3) return null
  const confidence = confidenceFor(snapshot, pairedLowerNextDay.length, 5, 0.72, 0.95)
  if (!eligibleConfidence(confidence, false)) return null
  return buildCandidate(snapshot, {
    type: 'opportunity',
    category: 'stress',
    severity: 'medium',
    confidence,
    title: 'Evening stress often coincides with softer next-day signals',
    summary: 'Recent evening high-stress check-ins often coincide with lower sleep or energy afterward. This is a pattern, not a proven cause.',
    action: { title: 'Add an evening downshift', detail: 'Try one low-effort wind-down cue before bed.' },
    evidence: evidence(snapshot, [
      ['daily_checkins', eveningHighStress[0]?.id, 'Evening check-ins', 'At least three evening check-ins show higher stress.'],
      ['health_signals', latest(snapshot.healthSignals)?.id, 'Next-day signals', 'Sleep or energy appears lower after those evenings.'],
    ]),
    limitations: confidence.limitations,
  })
}

function buildCandidate(snapshot: ProactiveSnapshot, input: {
  type: CandidateType
  category: CandidateCategory
  severity: CandidateSeverity
  confidence: ConfidenceBreakdown
  title: string
  summary: string
  action: RecommendedAction | null
  evidence: SourceReference[]
  limitations: string[]
}): GeneratedCandidate {
  const themeKey = `${input.type}:${input.category}:${normalize(input.title)}`
  const refs = input.evidence.map((item) => item.sourceReference)
  const candidateHash = hashStable({ themeKey, healthDate: snapshot.healthDate, refs, title: input.title })
  return {
    user_id: snapshot.userId,
    health_date: snapshot.healthDate,
    theme_key: themeKey,
    candidate_hash: candidateHash,
    data_window_start: snapshot.windowStart,
    data_window_end: snapshot.windowEnd,
    candidate_type: input.type,
    category: input.category,
    severity: input.severity,
    confidence_score: input.confidence.score,
    confidence_label: input.confidence.label,
    deterministic_title: input.title,
    deterministic_summary: input.summary,
    recommended_action: input.action,
    evidence_json: {
      summary: input.summary,
      evidence: input.evidence.slice(0, 3),
      confidence: input.confidence.label === 'insufficient' ? 'low' : input.confidence.label,
      limitations: Array.from(new Set(input.limitations)).slice(0, 4),
    },
    source_references: refs,
    ranking_score: null,
    status: 'candidate',
    eligible_from: snapshot.nowIso,
    expires_at: new Date(new Date(snapshot.nowIso).getTime() + 36 * 3_600_000).toISOString(),
    suppression_reason: null,
    created_by_engine_version: PROACTIVE_ENGINE_VERSION,
    confidenceBreakdown: input.confidence,
  }
}

function confidenceFor(snapshot: ProactiveSnapshot, validDataPoints: number, expectedDataPoints: number, consistency: number, sourceQuality: number) {
  const latestSignal = latest(snapshot.healthSignals)
  return calculateConfidence({
    validDataPoints,
    expectedDataPoints,
    consistency,
    latestAgeDays: latestSignal ? daysBetween(latestSignal.signal_date, snapshot.healthDate) : 7,
    sourceQuality,
  })
}

function eligibleConfidence(confidence: ConfidenceBreakdown, allowLow: boolean) {
  if (confidence.label === 'high' || confidence.label === 'moderate') return true
  return allowLow && confidence.label === 'low'
}

function evidence(snapshot: ProactiveSnapshot, items: Array<[string, string | undefined, string, string]>): SourceReference[] {
  return items
    .filter(([, id]) => Boolean(id))
    .slice(0, 3)
    .map(([table, id, label, explanation]) => ({ sourceReference: `${table}:${id}`, label, explanation }))
    .filter((item) => {
      if (item.sourceReference.endsWith(':undefined')) return false
      if (!item.sourceReference.startsWith('daily_checkins:')) return true
      return snapshot.dailyCheckins.some((checkin) => item.sourceReference === `daily_checkins:${checkin.id}`)
    })
}

function currentFactors(snapshot: ProactiveSnapshot) {
  return snapshot.scoreFactors.filter((factor) => factor.score_date >= snapshot.windowStart && factor.score_date <= snapshot.windowEnd)
}

function previousFactors(snapshot: ProactiveSnapshot) {
  return snapshot.scoreFactors.filter((factor) => factor.score_date < snapshot.windowStart)
}

function recentSignals(snapshot: ProactiveSnapshot) {
  return snapshot.healthSignals.filter((signal) => signal.signal_date >= snapshot.windowStart && signal.signal_date <= snapshot.windowEnd)
}

function hasSleepAttentionCandidate(snapshot: ProactiveSnapshot) {
  const sleepScores = values(currentFactors(snapshot).map((factor) => factor.sleep_score))
  return sleepScores.length >= 3 && hasConsecutiveDecline(sleepScores)
}

function latest<T extends { [key: string]: unknown }>(items: T[]): T | undefined {
  return items[0]
}

function values(items: Array<number | null | undefined>) {
  return items.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

function average(items: number[]) {
  if (items.length === 0) return 0
  return items.reduce((sum, value) => sum + value, 0) / items.length
}

function variance(items: number[]) {
  if (items.length === 0) return 0
  const mean = average(items)
  return average(items.map((value) => (value - mean) ** 2))
}

function hasConsecutiveDecline(items: Array<number | null | undefined>) {
  const cleaned = values(items)
  for (let index = 0; index < cleaned.length - 1; index += 1) {
    if (cleaned[index] < cleaned[index + 1]) return true
  }
  return false
}

function daysBetween(startDate: string, endDate: string) {
  return Math.max(0, (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000)
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function hashStable(value: unknown) {
  const input = JSON.stringify(value)
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
