import { describe, expect, it } from 'vitest'
import { getJsonSchemaForTask, getResponseSchemaName } from '../contracts.ts'
import {
  AskAboutTodayResponseSchema,
  CoachFollowUpResponseSchema,
  DailyBriefRewriteResponseSchema,
  ExplainScoreResponseSchema,
  WeeklyReflectionRewriteResponseSchema,
} from '../schemas.ts'
import type { TaskType } from '../types.ts'
import { FakeAIProvider } from './fake.provider.ts'

describe('FakeAIProvider', () => {
  it.each<TaskType>([
    'rewrite_daily_brief',
    'explain_score',
    'ask_about_today',
    'coach_follow_up',
    'rewrite_weekly_reflection',
    'coach_from_weekly_reflection',
    'coach_from_card',
  ])('returns a schema-valid fixture for %s', async (taskType) => {
    const provider = new FakeAIProvider()
    const result = await provider.generateStructured({
      modelAlias: 'nuraa_fast_structured',
      instructions: 'test',
      input: {},
      responseSchemaName: getResponseSchemaName(taskType),
      responseSchema: getJsonSchemaForTask(taskType),
      maxOutputTokens: 500,
      safetyIdentifier: 'test-user',
    })

    expect(parsePayload(taskType, result.parsed).success).toBe(true)
  })
})

function parsePayload(taskType: TaskType, payload: unknown) {
  if (taskType === 'rewrite_daily_brief') return DailyBriefRewriteResponseSchema.safeParse(payload)
  if (taskType === 'explain_score') return ExplainScoreResponseSchema.safeParse(payload)
  if (taskType === 'ask_about_today') return AskAboutTodayResponseSchema.safeParse(payload)
  if (taskType === 'rewrite_weekly_reflection') return WeeklyReflectionRewriteResponseSchema.safeParse(payload)
  return CoachFollowUpResponseSchema.safeParse(payload)
}
