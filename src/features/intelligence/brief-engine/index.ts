import type { DailyBrief, HealthSignal, InsightRuleResult, NuraaScoreResult } from '../types'

export function generateDailyBrief(signal: HealthSignal, score: NuraaScoreResult, rules: InsightRuleResult[]): DailyBrief {
  const sleepCaution = rules.find((rule) => rule.ruleId === 'poor_sleep')
  const stressCaution = rules.find((rule) => rule.ruleId === 'high_stress')
  const positive = rules.find((rule) => rule.severity === 'positive')
  const confidenceLimited = score.confidence < 45

  if (confidenceLimited) {
    return {
      userId: signal.userId,
      date: signal.date,
      headline: 'Your baseline is taking shape.',
      summary: 'Complete a few more check-ins so Nuraa can better understand your sleep, stress, and recovery rhythm.',
      focus: score.recommendations.slice(0, 3).map(({ title, description, category }) => ({ title, description, category })),
      insight: 'More daily signals will make your guidance more personal.',
      tone: 'calm',
    }
  }

  if (sleepCaution) {
    return {
      userId: signal.userId,
      date: signal.date,
      headline: 'Your body may need a gentler day.',
      summary: 'Sleep quality is pulling down your readiness. Choose lighter movement and protect recovery tonight.',
      focus: [
        { title: 'Keep movement light', description: 'Choose a walk, mobility, or a lower-intensity session.', category: 'activity' },
        { title: 'Hydrate steadily', description: 'Keep water visible and sip consistently through the day.', category: 'hydration' },
        { title: 'Wind down earlier', description: 'Create a calmer evening routine to support recovery.', category: 'sleep' },
      ],
      insight: sleepCaution.recommendation,
      tone: 'recovery',
    }
  }

  if (stressCaution) {
    return {
      userId: signal.userId,
      date: signal.date,
      headline: 'A calmer pace may serve you today.',
      summary: 'Your stress check-in is elevated. Keep activity lighter and create one short reset window.',
      focus: [
        { title: 'Take a breathing break', description: 'Use two quiet minutes before your next demanding block.', category: 'stress' },
        { title: 'Choose lighter movement', description: 'Let movement reduce load rather than add to it.', category: 'activity' },
        { title: 'Anchor your next meal', description: 'Keep energy steady with a simple protein-rich meal.', category: 'nutrition' },
      ],
      insight: stressCaution.recommendation,
      tone: 'calm',
    }
  }

  if (positive || score.totalScore >= 70) {
    return {
      userId: signal.userId,
      date: signal.date,
      headline: 'You’re ready for a strong day.',
      summary: 'Your sleep and energy are supporting you today. Keep hydration steady and make time for movement.',
      focus: score.recommendations.slice(0, 3).map(({ title, description, category }) => ({ title, description, category })),
      insight: positive?.recommendation ?? score.explanation,
      tone: 'performance',
    }
  }

  return {
    userId: signal.userId,
    date: signal.date,
    headline: 'Your body is asking for steady basics.',
    summary: 'Your check-in suggests a balanced day: steady hydration, practical meals, and movement that respects recovery.',
    focus: score.recommendations.slice(0, 3).map(({ title, description, category }) => ({ title, description, category })),
    insight: rules[0]?.recommendation ?? score.explanation,
    tone: 'encouraging',
  }
}
