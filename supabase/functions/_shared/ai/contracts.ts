import type { PromptContract, TaskType } from './types.ts'

const base = {
  version: 'phase4a.v1',
  safetyPolicyVersion: 'phase4a.v1',
  contextContractVersion: 'phase4a.v1',
  outputSchemaVersion: 'phase4a.v1',
  modelAlias: 'nuraa_fast_structured',
} as const

export const PROMPT_CONTRACTS: Record<TaskType, PromptContract> = {
  rewrite_daily_brief: {
    ...base,
    name: 'rewrite_daily_brief',
    taskType: 'rewrite_daily_brief',
    maxOutputTokens: 450,
    checksum: 'phase4a-rewrite-daily-brief-v1',
  },
  explain_score: {
    ...base,
    name: 'explain_score',
    taskType: 'explain_score',
    maxOutputTokens: 650,
    checksum: 'phase4a-explain-score-v1',
  },
  ask_about_today: {
    ...base,
    name: 'ask_about_today',
    taskType: 'ask_about_today',
    maxOutputTokens: 700,
    checksum: 'phase4a-ask-about-today-v1',
  },
}

export const TASK_FLAG_MAP: Record<TaskType, string> = {
  rewrite_daily_brief: 'ENABLE_AI_DAILY_BRIEF',
  explain_score: 'ENABLE_AI_SCORE_EXPLANATION',
  ask_about_today: 'ENABLE_AI_ASK_ABOUT_TODAY',
}

export function getPromptContract(taskType: TaskType): PromptContract {
  return PROMPT_CONTRACTS[taskType]
}

export function getResponseSchemaName(taskType: TaskType): string {
  return {
    rewrite_daily_brief: 'DailyBriefRewriteResponse',
    explain_score: 'ExplainScoreResponse',
    ask_about_today: 'AskAboutTodayResponse',
  }[taskType]
}

export function getJsonSchemaForTask(taskType: TaskType): Record<string, unknown> {
  const commonString = { type: 'string' }
  if (taskType === 'rewrite_daily_brief') {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'summary', 'sourceReferences'],
      properties: {
        headline: commonString,
        summary: commonString,
        primaryAction: primaryActionSchema(),
        confidenceNote: commonString,
        sourceReferences: sourceReferencesSchema(),
      },
    }
  }
  if (taskType === 'explain_score') {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'summary', 'factualBasis', 'interpretations', 'followUpQuestions', 'sourceReferences'],
      properties: {
        headline: commonString,
        summary: commonString,
        factualBasis: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'sourceReference'],
            properties: { label: commonString, sourceReference: commonString },
          },
        },
        interpretations: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['statement', 'confidence'],
            properties: { statement: commonString, confidence: { type: 'string', enum: ['high', 'moderate', 'low'] } },
          },
        },
        primaryAction: primaryActionSchema(),
        confidenceNote: commonString,
        followUpQuestions: { type: 'array', items: commonString },
        sourceReferences: sourceReferencesSchema(),
      },
    }
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'summary', 'primaryFocus', 'factualBasis', 'suggestedPrompts', 'sourceReferences'],
    properties: {
      headline: commonString,
      summary: commonString,
      primaryFocus: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: { title: commonString, detail: commonString },
      },
      factualBasis: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'sourceReference'],
          properties: { label: commonString, sourceReference: commonString },
        },
      },
      suggestedPrompts: { type: 'array', items: commonString },
      confidenceNote: commonString,
      sourceReferences: sourceReferencesSchema(),
    },
  }
}

function primaryActionSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: {
      title: { type: 'string' },
      detail: { type: 'string' },
    },
  }
}

function sourceReferencesSchema() {
  return { type: 'array', items: { type: 'string' } }
}
