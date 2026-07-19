import { invokeAIGateway } from '@/services/aiGateway'
import { invokeAuthenticatedFunction } from '@/services/supabaseFunction'
import type { AIDetailLevel, AIGatewayResponse } from '@/features/ai/types'
import type { WeeklyReflection } from '@/types/database'

export type WeeklyReflectionEngineResponse = {
  requestId: string
  status: 'completed' | 'disabled'
  reason?: string
  reflection: WeeklyReflection | null
}

type WeeklyReflectionAction =
  | { action: 'generate_weekly_reflection' }
  | { action: 'get_current_weekly_reflection' }
  | { action: 'mark_viewed'; reflectionId: string }
  | { action: 'dismiss_reflection'; reflectionId: string }
  | { action: 'start_coach_handoff'; reflectionId: string }

export async function getCurrentWeeklyReflection(): Promise<WeeklyReflectionEngineResponse> {
  return invokeWeeklyReflectionEngine({ action: 'get_current_weekly_reflection' })
}

export async function generateWeeklyReflection(): Promise<WeeklyReflectionEngineResponse> {
  return invokeWeeklyReflectionEngine({ action: 'generate_weekly_reflection' })
}

export async function markWeeklyReflectionViewed(id: string): Promise<WeeklyReflectionEngineResponse> {
  return invokeWeeklyReflectionEngine({ action: 'mark_viewed', reflectionId: id })
}

export async function dismissWeeklyReflection(id: string): Promise<WeeklyReflectionEngineResponse> {
  return invokeWeeklyReflectionEngine({ action: 'dismiss_reflection', reflectionId: id })
}

export async function startWeeklyReflectionCoach(id: string, detailLevel: AIDetailLevel = 'balanced'): Promise<AIGatewayResponse> {
  await invokeWeeklyReflectionEngine({ action: 'start_coach_handoff', reflectionId: id })
  return invokeAIGateway({
    taskType: 'coach_from_weekly_reflection',
    entryPoint: 'weekly_reflection_to_coach',
    weeklyReflectionId: id,
    detailLevel,
    idempotencyKey: `weekly_coach_${id}_${crypto.randomUUID()}`,
  })
}

async function invokeWeeklyReflectionEngine(body: WeeklyReflectionAction): Promise<WeeklyReflectionEngineResponse> {
  return invokeAuthenticatedFunction<WeeklyReflectionEngineResponse>('weekly-reflection-engine', body)
}
