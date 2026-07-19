import type { DailyCheckin, HealthProfile, Profile, UserGoal, UserPreferences } from '@/types/database'
import { getTodayInTimezone } from '@/lib/date'
import { average, round, scaleFivePoint } from '../scoring-utils'
import type { HealthSignal } from '../types'

type SignalInput = {
  profile: Profile
  healthProfile: HealthProfile | null
  goals: UserGoal[]
  preferences: UserPreferences | null
  checkin: DailyCheckin | null
}

function parseCheckinNotes(notes: string | null) {
  if (!notes) return { soreness: null, motivation: null, hydrationLitres: null }
  try {
    const parsed = JSON.parse(notes) as { body_soreness?: number; motivation_level?: number; hydration_litres?: number }
    return {
      soreness: parsed.body_soreness ?? null,
      motivation: parsed.motivation_level ?? null,
      hydrationLitres: parsed.hydration_litres ?? null,
    }
  } catch {
    return { soreness: null, motivation: null, hydrationLitres: null }
  }
}

function sleepHoursScore(hours: number | null) {
  if (hours === null) return null
  if (hours >= 7.5) return 95
  if (hours >= 7) return 90
  if (hours >= 6) return 74
  if (hours >= 5) return 52
  return 34
}

function hydrationLitresScore(litres: number | null) {
  if (litres === null) return null
  if (litres >= 2.5) return 95
  if (litres >= 2) return 85
  if (litres >= 1.5) return 70
  if (litres >= 1) return 52
  return 34
}

function confidenceFromPresent(present: number, total: number, emptyConfidence = 20) {
  if (present === 0) return emptyConfidence
  return round(45 + (present / total) * 50)
}

export function buildHealthSignal({ profile, healthProfile, goals, preferences, checkin }: SignalInput): HealthSignal {
  const parsedNotes = parseCheckinNotes(checkin?.notes ?? null)
  const sleepScores = [sleepHoursScore(checkin?.sleep_hours ?? null), scaleFivePoint(checkin?.sleep_quality, 'higher-is-better')].filter((value): value is number => value !== null)
  const recoveryScores = [
    scaleFivePoint(checkin?.energy_level, 'higher-is-better'),
    scaleFivePoint(parsedNotes.motivation, 'higher-is-better'),
    scaleFivePoint(parsedNotes.soreness, 'lower-is-better'),
  ].filter((value): value is number => value !== null)
  const sleepScore = sleepScores.length ? round(average(sleepScores)) : 70
  const stressScore = scaleFivePoint(checkin?.stress_level, 'lower-is-better') ?? 70
  const recoveryScore = recoveryScores.length ? round(average(recoveryScores)) : 70
  const activityScore = healthProfile?.activity_level ? 74 : 70
  const nutritionScore = preferences?.diet_preference ? 74 : 70
  const hydrationScore = hydrationLitresScore(parsedNotes.hydrationLitres) ?? 70

  return {
    userId: profile.id,
    date: checkin?.checkin_date ?? getTodayInTimezone(),
    sleep: {
      hours: checkin?.sleep_hours ?? null,
      quality: checkin?.sleep_quality ?? null,
      score: sleepScore,
      confidence: confidenceFromPresent(sleepScores.length, 2),
    },
    stress: {
      level: checkin?.stress_level ?? null,
      score: stressScore,
      confidence: checkin?.stress_level ? 90 : 20,
    },
    recovery: {
      soreness: parsedNotes.soreness,
      energy: checkin?.energy_level ?? null,
      motivation: parsedNotes.motivation,
      score: recoveryScore,
      confidence: confidenceFromPresent(recoveryScores.length, 3),
    },
    activity: {
      steps: null,
      movementScore: activityScore,
      confidence: healthProfile?.activity_level ? 35 : 18,
    },
    nutrition: {
      calories: null,
      protein: null,
      score: nutritionScore,
      confidence: preferences?.diet_preference ? 35 : 18,
    },
    hydration: {
      litres: parsedNotes.hydrationLitres,
      score: hydrationScore,
      confidence: parsedNotes.hydrationLitres === null ? 18 : 90,
    },
    context: {
      mood: checkin?.mood ?? null,
      goals: goals.map((goal) => goal.goal_label),
      medicalConditions: healthProfile?.medical_conditions ?? [],
      travelFrequency: preferences?.travel_frequency ?? undefined,
      workSchedule: preferences?.work_schedule ?? undefined,
    },
  }
}
