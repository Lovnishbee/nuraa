import { AIRequestInputSchema } from './schemas.ts'
import type { AIRequestInput, TaskType } from './types.ts'

export const ALLOWED_TASK_TYPES: TaskType[] = ['rewrite_daily_brief', 'explain_score', 'ask_about_today', 'coach_follow_up']

export function parseTaskInput(input: unknown): { ok: true; input: AIRequestInput } | { ok: false; errorCode: string; details?: unknown } {
  const parsed = AIRequestInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errorCode: 'INVALID_AI_REQUEST', details: parsed.error.flatten() }
  if (parsed.data.taskType === 'coach_follow_up' && !parsed.data.conversationId) {
    return { ok: false, errorCode: 'CONVERSATION_REQUIRED' }
  }
  if (parsed.data.taskType !== 'coach_follow_up' && parsed.data.entryPoint === 'coach_follow_up') {
    return { ok: false, errorCode: 'TASK_ENTRYPOINT_MISMATCH' }
  }
  return { ok: true, input: parsed.data }
}
