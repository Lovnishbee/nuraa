import { describe, expect, it } from 'vitest'
import { isToolAllowedForTask, TOOL_REGISTRY } from './tool-router.ts'

describe('ToolRouter', () => {
  it('keeps tools read-only and task allowlisted', () => {
    expect(TOOL_REGISTRY.every((tool) => tool.write === false)).toBe(true)
    expect(isToolAllowedForTask('get_score_comparison', 'explain_score')).toBe(true)
    expect(isToolAllowedForTask('get_score_comparison', 'rewrite_daily_brief')).toBe(false)
  })
})
