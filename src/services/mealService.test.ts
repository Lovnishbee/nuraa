import { describe, expect, it } from 'vitest'
import { buildMealLogPayload, buildMealLogUpdatePayload, toMealLogError } from './mealService'

describe('meal service payload', () => {
  it('normalizes meal input before database insert', () => {
    expect(buildMealLogPayload('user-1', {
      mealDate: '2026-07-17',
      mealType: 'lunch',
      mealName: '  Paneer bowl  ',
      notes: '  extra curd  ',
      calories: 520,
      proteinG: 32,
      carbsG: undefined,
      fatG: Number.NaN,
    })).toEqual({
      user_id: 'user-1',
      meal_date: '2026-07-17',
      meal_type: 'lunch',
      meal_name: 'Paneer bowl',
      notes: 'extra curd',
      calories: 520,
      protein_g: 32,
      carbs_g: null,
      fat_g: null,
    })
  })

  it('normalizes meal input before database update without user-owned fields', () => {
    expect(buildMealLogUpdatePayload({
      mealDate: '2026-07-18',
      mealType: 'dinner',
      mealName: '  Khichdi  ',
      notes: '   ',
      calories: undefined,
      proteinG: 18,
      carbsG: 54,
      fatG: null,
    })).toEqual({
      meal_date: '2026-07-18',
      meal_type: 'dinner',
      meal_name: 'Khichdi',
      notes: null,
      calories: null,
      protein_g: 18,
      carbs_g: 54,
      fat_g: null,
    })
  })

  it('returns an actionable message when the meal table has not been migrated', () => {
    expect(toMealLogError({ code: '42P01', message: 'relation "public.meal_logs" does not exist' }).message).toBe(
      'Meal logging needs the latest database migration before it can save data.',
    )
    expect(toMealLogError({ code: 'PGRST205', message: "Could not find the table 'public.meal_logs' in the schema cache" }).message).toBe(
      'Meal logging needs the latest database migration before it can save data.',
    )
  })
})
