import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { buildHealthProfileUpdatePayload, buildProfileBootstrapPayload, buildProfileUpdatePayload, buildUserGoalRows, buildUserPreferencesUpdatePayload } from './profile'

describe('profile bootstrap payload', () => {
  it('uses auth metadata to create the missing profile row safely', () => {
    const user = {
      id: 'user-1',
      aud: 'authenticated',
      email: 'lovnish@example.com',
      app_metadata: {},
      user_metadata: { full_name: 'Lovnish Bhatia' },
      created_at: '2026-07-17T00:00:00.000Z',
    } as User

    expect(buildProfileBootstrapPayload(user)).toEqual({
      id: 'user-1',
      email: 'lovnish@example.com',
      full_name: 'Lovnish Bhatia',
    })
  })

  it('falls back to an empty display name when metadata is absent', () => {
    const user = {
      id: 'user-1',
      aud: 'authenticated',
      email: undefined,
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-07-17T00:00:00.000Z',
    } as User

    expect(buildProfileBootstrapPayload(user)).toEqual({
      id: 'user-1',
      email: null,
      full_name: '',
    })
  })
})

describe('profile update payload', () => {
  it('normalizes basic profile fields before update', () => {
    expect(buildProfileUpdatePayload({
      fullName: '  Lovnish Bhatia  ',
      phone: '  +91 98765 43210  ',
      age: 34,
      gender: '  Male  ',
      locationCity: '  Mumbai ',
      locationCountry: ' India ',
      timezone: ' Asia/Kolkata ',
    })).toEqual({
      full_name: 'Lovnish Bhatia',
      phone: '+91 98765 43210',
      age: 34,
      gender: 'Male',
      location_city: 'Mumbai',
      location_country: 'India',
      timezone: 'Asia/Kolkata',
    })
  })

  it('uses safe nullable defaults for optional profile fields', () => {
    expect(buildProfileUpdatePayload({
      fullName: 'Nuraa Member',
      phone: ' ',
      age: Number.NaN,
      gender: '',
      locationCity: null,
      locationCountry: undefined,
      timezone: '',
    })).toEqual({
      full_name: 'Nuraa Member',
      phone: null,
      age: null,
      gender: null,
      location_city: null,
      location_country: null,
      timezone: 'Asia/Kolkata',
    })
  })

  it('normalizes health profile fields without changing ownership', () => {
    expect(buildHealthProfileUpdatePayload('user-1', {
      fullName: 'Lovnish Bhatia',
      heightCm: 175,
      weightKg: 72.5,
      targetWeightKg: Number.NaN,
      activityLevel: ' moderate ',
      fitnessLevel: ' beginner ',
    })).toEqual({
      user_id: 'user-1',
      height_cm: 175,
      weight_kg: 72.5,
      target_weight_kg: null,
      activity_level: 'moderate',
      fitness_level: 'beginner',
    })
  })

  it('normalizes medical context arrays in the health profile payload', () => {
    expect(buildHealthProfileUpdatePayload('user-1', {
      fullName: 'Lovnish Bhatia',
      medicalConditions: [' Thyroid ', 'PCOS', 'Thyroid', ''],
      allergies: [' peanuts ', ''],
      injuries: [' knee pain '],
      dietaryRestrictions: [' gluten-free ', 'gluten-free'],
    })).toEqual(expect.objectContaining({
      user_id: 'user-1',
      medical_conditions: ['Thyroid', 'PCOS'],
      allergies: ['peanuts'],
      injuries: ['knee pain'],
      dietary_restrictions: ['gluten-free'],
    }))
  })

  it('normalizes lifestyle and nutrition preferences before upsert', () => {
    expect(buildUserPreferencesUpdatePayload('user-1', {
      fullName: 'Lovnish Bhatia',
      dietPreference: ' vegetarian ',
      cuisinePreferences: [' Indian ', 'Thai', 'Indian', ''],
      dislikedFoods: [' olives ', ' ', 'mushrooms'],
      workType: ' desk work ',
      workSchedule: ' 9 to 6 ',
      commuteMinutes: 35,
      travelFrequency: ' sometimes ',
    })).toEqual({
      user_id: 'user-1',
      diet_preference: 'vegetarian',
      cuisine_preferences: ['Indian', 'Thai'],
      disliked_foods: ['olives', 'mushrooms'],
      work_type: 'desk work',
      work_schedule: '9 to 6',
      commute_minutes: 35,
      travel_frequency: 'sometimes',
    })
  })

  it('uses safe defaults for missing lifestyle and nutrition preferences', () => {
    expect(buildUserPreferencesUpdatePayload('user-1', {
      fullName: 'Lovnish Bhatia',
      dietPreference: '',
      cuisinePreferences: null,
      dislikedFoods: undefined,
      workType: ' ',
      workSchedule: null,
      commuteMinutes: Number.NaN,
      travelFrequency: undefined,
    })).toEqual({
      user_id: 'user-1',
      diet_preference: null,
      cuisine_preferences: [],
      disliked_foods: [],
      work_type: null,
      work_schedule: null,
      commute_minutes: null,
      travel_frequency: null,
    })
  })

  it('builds ordered active goal rows from selected labels', () => {
    expect(buildUserGoalRows('user-1', [' Lose Weight ', 'Improve Energy', 'Lose Weight', ''])).toEqual([
      {
        user_id: 'user-1',
        goal_type: 'Lose Weight'.toLowerCase().replaceAll(/\s+/g, '_'),
        goal_label: 'Lose Weight',
        priority: 1,
        status: 'active',
      },
      {
        user_id: 'user-1',
        goal_type: 'improve_energy',
        goal_label: 'Improve Energy',
        priority: 2,
        status: 'active',
      },
    ])
  })
})
