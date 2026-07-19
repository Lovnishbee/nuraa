import { describe, expect, it } from 'vitest'
import { buildWorkoutLogPayload, buildWorkoutLogUpdatePayload, toWorkoutLogError } from './workoutService'

describe('workout service payload', () => {
  it('normalizes workout input before database insert', () => {
    expect(buildWorkoutLogPayload('user-1', {
      workoutDate: '2026-07-17',
      activityType: 'strength',
      title: '  Upper body  ',
      durationMinutes: 45,
      intensity: 'moderate',
      caloriesBurned: Number.NaN,
      notes: '  felt steady  ',
    })).toEqual({
      user_id: 'user-1',
      workout_date: '2026-07-17',
      activity_type: 'strength',
      title: 'Upper body',
      duration_minutes: 45,
      intensity: 'moderate',
      calories_burned: null,
      notes: 'felt steady',
    })
  })

  it('normalizes workout input before database update without user-owned fields', () => {
    expect(buildWorkoutLogUpdatePayload({
      workoutDate: '2026-07-18',
      activityType: 'walk',
      title: '  Lunch walk  ',
      durationMinutes: 25,
      intensity: 'easy',
      caloriesBurned: undefined,
      notes: '   ',
    })).toEqual({
      workout_date: '2026-07-18',
      activity_type: 'walk',
      title: 'Lunch walk',
      duration_minutes: 25,
      intensity: 'easy',
      calories_burned: null,
      notes: null,
    })
  })

  it('returns an actionable message when the workout table has not been migrated', () => {
    expect(toWorkoutLogError({ code: '42P01', message: 'relation "public.workout_logs" does not exist' }).message).toBe(
      'Workout logging needs the latest database migration before it can save data.',
    )
    expect(toWorkoutLogError({ code: 'PGRST205', message: "Could not find the table 'public.workout_logs' in the schema cache" }).message).toBe(
      'Workout logging needs the latest database migration before it can save data.',
    )
  })
})
