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
    ['ask_about_today', 'future_dashboard'],
    ['ask_about_today', 'future_coach'],
    ['coach_follow_up', 'coach_follow_up'],
    ['rewrite_weekly_reflection', 'weekly_reflection'],
    ['coach_from_weekly_reflection', 'weekly_reflection_to_coach'],
    ['coach_from_card', 'proactive_card_to_coach'],
  ] as const)('accepts %s from %s', (taskType, entryPoint) => {
    const result = parseTaskInput({
      taskType,
      entryPoint,
      conversationId: taskType === 'coach_follow_up' ? '00000000-0000-4000-8000-000000000001' : undefined,
      weeklyReflectionId: taskType === 'rewrite_weekly_reflection' || taskType === 'coach_from_weekly_reflection' ? '00000000-0000-4000-8000-000000000002' : undefined,
      cardId: taskType === 'coach_from_card' ? '00000000-0000-4000-8000-000000000003' : undefined,
      userInput: taskType === 'coach_follow_up' ? { question: 'What should I prioritise?' } : undefined,
    })

    expect(result.ok).toBe(true)
  })

  it.each([
    ['rewrite_daily_brief', 'dashboard_ask_today'],
    ['explain_score', 'coach_home'],
    ['ask_about_today', 'dashboard_score'],
    ['coach_follow_up', 'internal_dev'],
    ['rewrite_weekly_reflection', 'dashboard_ask_today'],
    ['coach_from_weekly_reflection', 'coach_home'],
    ['coach_from_card', 'coach_home'],
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

  it('requires a weekly reflection id for weekly tasks', () => {
    expect(parseTaskInput({ taskType: 'rewrite_weekly_reflection', entryPoint: 'weekly_reflection' }).ok).toBe(false)
    expect(parseTaskInput({ taskType: 'coach_from_weekly_reflection', entryPoint: 'weekly_reflection_to_coach' }).ok).toBe(false)
  })

  it('requires a proactive card id for card-to-Coach', () => {
    expect(parseTaskInput({ taskType: 'coach_from_card', entryPoint: 'proactive_card_to_coach' }).ok).toBe(false)
  })
})
