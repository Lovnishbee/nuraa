import { AIRequestInputSchema } from './schemas.ts'
import type { AIRequestInput, TaskType } from './types.ts'

export const ALLOWED_TASK_TYPES: TaskType[] = ['rewrite_daily_brief', 'explain_score', 'ask_about_today']

export function parseTaskInput(input: unknown): { ok: true; input: AIRequestInput } | { ok: false; errorCode: string; details?: unknown } {
  const parsed = AIRequestInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errorCode: 'INVALID_AI_REQUEST', details: parsed.error.flatten() }
  return { ok: true, input: parsed.data }
}
