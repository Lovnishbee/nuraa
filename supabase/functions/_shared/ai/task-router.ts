import { AIRequestInputSchema } from './schemas.ts'
import type { AIRequestInput, EntryPoint, TaskType } from './types.ts'

export const ALLOWED_TASK_TYPES: TaskType[] = ['rewrite_daily_brief', 'explain_score', 'ask_about_today', 'coach_follow_up', 'rewrite_weekly_reflection', 'coach_from_weekly_reflection', 'coach_from_card']
const TASK_ENTRYPOINTS: Record<TaskType, EntryPoint[]> = {
  rewrite_daily_brief: ['internal_dev', 'future_dashboard', 'future_coach'],
  explain_score: ['internal_dev', 'future_dashboard', 'future_coach', 'dashboard_score'],
  ask_about_today: ['internal_dev', 'future_dashboard', 'future_coach', 'dashboard_ask_today', 'coach_home'],
  coach_follow_up: ['coach_follow_up'],
  rewrite_weekly_reflection: ['internal_dev', 'weekly_reflection'],
  coach_from_weekly_reflection: ['weekly_reflection_to_coach'],
  coach_from_card: ['proactive_card_to_coach'],
}

export function parseTaskInput(input: unknown): { ok: true; input: AIRequestInput } | { ok: false; errorCode: string; details?: unknown } {
  const parsed = AIRequestInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errorCode: 'INVALID_AI_REQUEST', details: parsed.error.flatten() }
  if (!TASK_ENTRYPOINTS[parsed.data.taskType].includes(parsed.data.entryPoint)) {
    return { ok: false, errorCode: 'TASK_ENTRYPOINT_MISMATCH' }
  }
  const question = parsed.data.userInput?.question?.trim()
  if (parsed.data.taskType === 'coach_follow_up' && !parsed.data.conversationId) {
    return { ok: false, errorCode: 'CONVERSATION_REQUIRED' }
  }
  if (parsed.data.taskType === 'coach_follow_up' && !question) {
    return { ok: false, errorCode: 'QUESTION_REQUIRED' }
  }
  if ((parsed.data.taskType === 'rewrite_weekly_reflection' || parsed.data.taskType === 'coach_from_weekly_reflection') && !parsed.data.weeklyReflectionId) {
    return { ok: false, errorCode: 'WEEKLY_REFLECTION_REQUIRED' }
  }
  if (parsed.data.taskType === 'coach_from_card' && !parsed.data.cardId) {
    return { ok: false, errorCode: 'PROACTIVE_CARD_REQUIRED' }
  }
  if (!['coach_follow_up'].includes(parsed.data.taskType) && question && parsed.data.entryPoint !== 'internal_dev') {
    return { ok: false, errorCode: 'QUESTION_NOT_ALLOWED' }
  }
  return { ok: true, input: parsed.data }
}
