import type { MealLog, WorkoutLog } from '@/types/database'

export type MealLogSummary = {
  mealsLogged: number
  calories: number
  proteinG: number
}

export type MealRangeSummary = MealLogSummary & {
  daysWithMeals: number
}

export type WorkoutLogSummary = {
  sessions: number
  minutes: number
  caloriesBurned: number
}

export type WorkoutRangeSummary = WorkoutLogSummary & {
  daysWithWorkouts: number
}

export function summarizeMealsForDate(meals: MealLog[], healthDate: string): MealLogSummary {
  return meals
    .filter((meal) => meal.meal_date === healthDate)
    .reduce<MealLogSummary>((summary, meal) => ({
      mealsLogged: summary.mealsLogged + 1,
      calories: summary.calories + (meal.calories ?? 0),
      proteinG: summary.proteinG + (meal.protein_g ?? 0),
    }), { mealsLogged: 0, calories: 0, proteinG: 0 })
}

export function summarizeMealsForRange(meals: MealLog[], startDate: string, endDate: string): MealRangeSummary {
  const days = new Set<string>()
  return meals
    .filter((meal) => isDateInRange(meal.meal_date, startDate, endDate))
    .reduce<MealRangeSummary>((summary, meal) => {
      days.add(meal.meal_date)
      return {
        mealsLogged: summary.mealsLogged + 1,
        calories: summary.calories + (meal.calories ?? 0),
        proteinG: summary.proteinG + (meal.protein_g ?? 0),
        daysWithMeals: days.size,
      }
    }, { mealsLogged: 0, calories: 0, proteinG: 0, daysWithMeals: 0 })
}

export function summarizeWorkoutsForDate(workouts: WorkoutLog[], healthDate: string): WorkoutLogSummary {
  return workouts
    .filter((workout) => workout.workout_date === healthDate)
    .reduce<WorkoutLogSummary>((summary, workout) => ({
      sessions: summary.sessions + 1,
      minutes: summary.minutes + workout.duration_minutes,
      caloriesBurned: summary.caloriesBurned + (workout.calories_burned ?? 0),
    }), { sessions: 0, minutes: 0, caloriesBurned: 0 })
}

export function summarizeWorkoutsForRange(workouts: WorkoutLog[], startDate: string, endDate: string): WorkoutRangeSummary {
  const days = new Set<string>()
  return workouts
    .filter((workout) => isDateInRange(workout.workout_date, startDate, endDate))
    .reduce<WorkoutRangeSummary>((summary, workout) => {
      days.add(workout.workout_date)
      return {
        sessions: summary.sessions + 1,
        minutes: summary.minutes + workout.duration_minutes,
        caloriesBurned: summary.caloriesBurned + (workout.calories_burned ?? 0),
        daysWithWorkouts: days.size,
      }
    }, { sessions: 0, minutes: 0, caloriesBurned: 0, daysWithWorkouts: 0 })
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate
}
