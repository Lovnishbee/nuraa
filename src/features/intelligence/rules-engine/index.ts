import type { HealthSignal, InsightRuleResult } from '../types'

export function runInsightRules(signal: HealthSignal): InsightRuleResult[] {
  const results: InsightRuleResult[] = []

  if ((signal.sleep.hours !== null && signal.sleep.hours < 6) || (signal.sleep.quality !== null && signal.sleep.quality <= 2)) {
    results.push({
      ruleId: 'poor_sleep',
      title: 'Your body may need a gentler day',
      description: 'Your sleep check-in suggests recovery may be lower today.',
      category: 'sleep',
      severity: 'caution',
      recommendation: 'Choose lighter activity, hydrate steadily, and consider an earlier wind-down tonight.',
    })
  }

  if (signal.stress.level !== null && signal.stress.level >= 4) {
    results.push({
      ruleId: 'high_stress',
      title: 'Stress load looks elevated',
      description: 'Your check-in suggests today may benefit from calmer pacing.',
      category: 'stress',
      severity: 'caution',
      recommendation: 'Consider lighter activity and a short breathing break before intense work.',
    })
  }

  if (signal.recovery.energy !== null && signal.recovery.energy <= 2) {
    results.push({
      ruleId: 'low_energy',
      title: 'Energy is running low',
      description: 'Your check-in suggests a recovery-focused day may be useful.',
      category: 'recovery',
      severity: 'caution',
      recommendation: 'Prioritize hydration, a protein-rich meal, and one manageable movement window.',
    })
  }

  if (signal.recovery.soreness !== null && signal.recovery.soreness >= 4) {
    results.push({
      ruleId: 'high_soreness',
      title: 'Soreness needs respect',
      description: 'Your check-in suggests your body may benefit from lower intensity today.',
      category: 'recovery',
      severity: 'caution',
      recommendation: 'Consider mobility, stretching, or an easy walk instead of intense training.',
    })
  }

  if ((signal.sleep.hours ?? 0) >= 7 && (signal.stress.level ?? 5) <= 3 && (signal.recovery.energy ?? 0) >= 4) {
    results.push({
      ruleId: 'good_readiness',
      title: 'You look ready for a stronger day',
      description: 'Sleep, stress, and energy are aligned well in today’s check-in.',
      category: 'performance',
      severity: 'positive',
      recommendation: 'Consider strength-focused movement and keep nutrition consistent.',
    })
  }

  if (signal.recovery.motivation !== null && signal.recovery.motivation <= 2) {
    results.push({
      ruleId: 'low_motivation',
      title: 'Keep the next step small',
      description: 'Your motivation check-in suggests a simple win may work better than a large plan.',
      category: 'mindset',
      severity: 'neutral',
      recommendation: 'Try a short walk or one easy meal upgrade to keep momentum.',
    })
  }

  if (!results.length) {
    results.push({
      ruleId: 'baseline_building',
      title: 'Your baseline is taking shape',
      description: 'A few more check-ins will help Nuraa understand your normal rhythm.',
      category: 'baseline',
      severity: 'neutral',
      recommendation: 'Keep logging sleep, stress, energy, and recovery signals.',
    })
  }

  return results
}
