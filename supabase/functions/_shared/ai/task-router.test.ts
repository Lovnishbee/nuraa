import { describe, expect, it } from 'vitest'
import { parseTaskInput } from './task-router.ts'

describe('TaskRouter exact entry points', () => {
  it.each([
    ['rewrite_daily_brief', 'internal_dev'],
    ['explain_score', 'internal_dev'],
    ['explain_score', 'dashboard_score'],
    ['ask_about_today', 'internal_dev'],
    ['ask_about_today', 'dashboard_ask_today'],
    ['ask_about_today', 'coach_home'],
    ['coach_follow_up', 'coach_follow_up'],
  ] as const)('accepts %s from %s', (taskType, entryPoint) => {
    const result = parseTaskInput({
      taskType,
      entryPoint,
      conversationId: taskType === 'coach_follow_up' ? '00000000-0000-4000-8000-000000000001' : undefined,
      userInput: taskType === 'coach_follow_up' ? { question: 'What should I prioritise?' } : undefined,
    })

    expect(result.ok).toBe(true)
  })

  it.each([
    ['rewrite_daily_brief', 'dashboard_ask_today'],
    ['explain_score', 'coach_home'],
    ['ask_about_today', 'dashboard_score'],
    ['coach_follow_up', 'internal_dev'],
    ['ask_about_today', 'future_dashboard'],
    ['ask_about_today', 'future_coach'],
  ] as const)('rejects %s from %s', (taskType, entryPoint) => {
    const result = parseTaskInput({
      taskType,
      entryPoint,
      conversationId: taskType === 'coach_follow_up' ? '00000000-0000-4000-8000-000000000001' : undefined,
      userInput: taskType === 'coach_follow_up' ? { question: 'What should I prioritise?' } : undefined,
    })

    expect(result.ok).toBe(false)
  })

  it('requires a conversation and question for Coach follow-up', () => {
    expect(parseTaskInput({ taskType: 'coach_follow_up', entryPoint: 'coach_follow_up', userInput: { question: 'Hi' } }).ok).toBe(false)
    expect(parseTaskInput({ taskType: 'coach_follow_up', entryPoint: 'coach_follow_up', conversationId: '00000000-0000-4000-8000-000000000001' }).ok).toBe(false)
  })
})
