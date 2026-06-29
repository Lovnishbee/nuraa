export type SignalScore = {
  score: number
  confidence: number
}

export type HealthSignal = {
  userId: string
  date: string
  sleep: {
    hours: number | null
    quality: number | null
    score: number
    confidence: number
  }
  stress: {
    level: number | null
    score: number
    confidence: number
  }
  recovery: {
    soreness: number | null
    energy: number | null
    motivation: number | null
    score: number
    confidence: number
  }
  activity: {
    steps: number | null
    movementScore: number
    confidence: number
  }
  nutrition: {
    calories: number | null
    protein: number | null
    score: number
    confidence: number
  }
  hydration: {
    litres: number | null
    score: number
    confidence: number
  }
  context: {
    mood?: string | null
    goals: string[]
    medicalConditions: string[]
    travelFrequency?: string
    workSchedule?: string
  }
}

export type NuraaScoreCategory = 'Peak' | 'Ready' | 'Steady' | 'Low' | 'Recovery Needed'
export type RecommendationCategory = 'sleep' | 'stress' | 'recovery' | 'activity' | 'nutrition' | 'hydration'

export type NuraaScoreResult = {
  userId: string
  date: string
  totalScore: number
  category: NuraaScoreCategory
  confidence: number
  primaryDriver: string
  limitingFactor: string
  explanation: string
  factors: {
    sleep: number
    stress: number
    recovery: number
    activity: number
    nutrition: number
    hydration: number
  }
  recommendations: {
    title: string
    description: string
    category: RecommendationCategory
    priority: 'high' | 'medium' | 'low'
  }[]
}

export type InsightRuleResult = {
  ruleId: string
  title: string
  description: string
  category: string
  severity: 'positive' | 'neutral' | 'caution'
  recommendation: string
}

export type DailyBrief = {
  userId: string
  date: string
  headline: string
  summary: string
  focus: {
    title: string
    description: string
    category: string
  }[]
  insight: string
  tone: 'encouraging' | 'calm' | 'recovery' | 'performance'
}
