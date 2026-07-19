import { describe, expect, it } from 'vitest'
import type { MealLog, WorkoutLog } from '@/types/database'
import { summarizeMealsForDate, summarizeMealsForRange, summarizeWorkoutsForDate, summarizeWorkoutsForRange } from './log-summary'

describe('dashboard log summaries', () => {
  it('summarizes only meals from the requested local health date', () => {
    const meals = [
      { meal_date: '2026-07-18', calories: 520, protein_g: 32 },
      { meal_date: '2026-07-18', calories: null, protein_g: 12 },
      { meal_date: '2026-07-17', calories: 800, protein_g: 40 },
    ] as MealLog[]

    expect(summarizeMealsForDate(meals, '2026-07-18')).toEqual({
      mealsLogged: 2,
      calories: 520,
      proteinG: 44,
    })
  })

  it('summarizes meals across an inclusive local health-date range', () => {
    const meals = [
      { meal_date: '2026-07-15', calories: 400, protein_g: 20 },
      { meal_date: '2026-07-16', calories: 600, protein_g: 35 },
      { meal_date: '2026-07-18', calories: 300, protein_g: 12 },
      { meal_date: '2026-07-19', calories: 900, protein_g: 50 },
    ] as MealLog[]

    expect(summarizeMealsForRange(meals, '2026-07-15', '2026-07-18')).toEqual({
      mealsLogged: 3,
      calories: 1300,
      proteinG: 67,
      daysWithMeals: 3,
    })
  })

  it('summarizes only workouts from the requested local health date', () => {
    const workouts = [
      { workout_date: '2026-07-18', duration_minutes: 30, calories_burned: 140 },
      { workout_date: '2026-07-18', duration_minutes: 20, calories_burned: null },
      { workout_date: '2026-07-17', duration_minutes: 45, calories_burned: 220 },
    ] as WorkoutLog[]

    expect(summarizeWorkoutsForDate(workouts, '2026-07-18')).toEqual({
      sessions: 2,
      minutes: 50,
      caloriesBurned: 140,
    })
  })

  it('summarizes workouts across an inclusive local health-date range', () => {
    const workouts = [
      { workout_date: '2026-07-14', duration_minutes: 30, calories_burned: 120 },
      { workout_date: '2026-07-15', duration_minutes: 25, calories_burned: 90 },
      { workout_date: '2026-07-15', duration_minutes: 20, calories_burned: null },
      { workout_date: '2026-07-18', duration_minutes: 45, calories_burned: 220 },
    ] as WorkoutLog[]

    expect(summarizeWorkoutsForRange(workouts, '2026-07-15', '2026-07-18')).toEqual({
      sessions: 3,
      minutes: 90,
      caloriesBurned: 310,
      daysWithWorkouts: 2,
    })
  })
})
