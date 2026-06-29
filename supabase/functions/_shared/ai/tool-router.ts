import { z } from 'zod'
import type { TaskType } from './types.ts'

export type ToolDefinition = {
  name: 'get_score_comparison' | 'get_relevant_sleep_trend' | 'get_current_priorities' | 'get_active_goals'
  allowedTaskTypes: TaskType[]
  inputSchema: z.ZodType
  outputSchema: z.ZodType
  write: false
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  tool('get_score_comparison', ['explain_score']),
  tool('get_relevant_sleep_trend', ['explain_score', 'ask_about_today']),
  tool('get_current_priorities', ['rewrite_daily_brief', 'ask_about_today']),
  tool('get_active_goals', ['ask_about_today']),
]

export function isToolAllowedForTask(toolName: string, taskType: TaskType): boolean {
  return TOOL_REGISTRY.some((toolDefinition) => toolDefinition.name === toolName && toolDefinition.allowedTaskTypes.includes(taskType) && toolDefinition.write === false)
}

function tool(name: ToolDefinition['name'], allowedTaskTypes: TaskType[]): ToolDefinition {
  return {
    name,
    allowedTaskTypes,
    inputSchema: z.object({}).strict(),
    outputSchema: z.record(z.unknown()),
    write: false,
  }
}
