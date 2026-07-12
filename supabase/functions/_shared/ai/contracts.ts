import { PHASE4A_SCHEMA_VERSION, PHASE4B_SCHEMA_VERSION, PHASE_V_C_SCHEMA_VERSION } from './types.ts'
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
  coach_follow_up: {
    ...base,
    version: PHASE4B_SCHEMA_VERSION,
    contextContractVersion: PHASE4B_SCHEMA_VERSION,
    outputSchemaVersion: PHASE4B_SCHEMA_VERSION,
    name: 'coach_follow_up',
    taskType: 'coach_follow_up',
    modelAlias: 'nuraa_coach_balanced',
    maxOutputTokens: 700,
    checksum: 'phase4b-coach-follow-up-v1',
  },
  rewrite_weekly_reflection: {
    ...base,
    version: PHASE_V_C_SCHEMA_VERSION,
    contextContractVersion: PHASE_V_C_SCHEMA_VERSION,
    outputSchemaVersion: PHASE_V_C_SCHEMA_VERSION,
    name: 'rewrite_weekly_reflection',
    taskType: 'rewrite_weekly_reflection',
    modelAlias: 'nuraa_fast_structured',
    maxOutputTokens: 700,
    checksum: 'phase-v-c-rewrite-weekly-reflection-v1',
  },
  coach_from_weekly_reflection: {
    ...base,
    version: PHASE_V_C_SCHEMA_VERSION,
    contextContractVersion: PHASE_V_C_SCHEMA_VERSION,
    outputSchemaVersion: PHASE4B_SCHEMA_VERSION,
    name: 'coach_from_weekly_reflection',
    taskType: 'coach_from_weekly_reflection',
    modelAlias: 'nuraa_coach_balanced',
    maxOutputTokens: 700,
    checksum: 'phase-v-c-coach-from-weekly-reflection-v1',
  },
}

export const TASK_FLAG_MAP: Record<TaskType, string> = {
  rewrite_daily_brief: 'ENABLE_AI_DAILY_BRIEF',
  explain_score: 'ENABLE_AI_SCORE_EXPLANATION',
  ask_about_today: 'ENABLE_AI_ASK_ABOUT_TODAY',
  coach_follow_up: 'ENABLE_AI_COACH',
  rewrite_weekly_reflection: 'ENABLE_WEEKLY_REFLECTION_AI_COPY',
  coach_from_weekly_reflection: 'ENABLE_AI_COACH',
}

export function getPromptContract(taskType: TaskType): PromptContract {
  return PROMPT_CONTRACTS[taskType]
}

export function getResponseSchemaName(taskType: TaskType): string {
  return {
    rewrite_daily_brief: 'DailyBriefRewriteResponse',
    explain_score: 'ExplainScoreResponse',
    ask_about_today: 'AskAboutTodayResponse',
    coach_follow_up: 'CoachFollowUpResponse',
    rewrite_weekly_reflection: 'WeeklyReflectionRewriteResponse',
    coach_from_weekly_reflection: 'CoachFollowUpResponse',
  }[taskType]
}

export function getJsonSchemaForTask(taskType: TaskType): Record<string, unknown> {
  const commonString = { type: 'string' }
  const nullableString = { type: ['string', 'null'] }
  if (taskType === 'rewrite_daily_brief') {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'summary', 'primaryAction', 'confidenceNote', 'sourceReferences'],
      properties: {
        headline: commonString,
        summary: commonString,
        primaryAction: primaryActionSchema(),
        confidenceNote: nullableString,
        sourceReferences: sourceReferencesSchema(),
      },
    }
  }
  if (taskType === 'explain_score') {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'summary', 'factualBasis', 'interpretations', 'primaryAction', 'confidenceNote', 'followUpQuestions', 'sourceReferences'],
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
        confidenceNote: nullableString,
        followUpQuestions: { type: 'array', items: commonString },
        sourceReferences: sourceReferencesSchema(),
      },
    }
  }
  if (taskType === 'ask_about_today') return {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'summary', 'primaryFocus', 'factualBasis', 'suggestedPrompts', 'confidenceNote', 'sourceReferences'],
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
      confidenceNote: nullableString,
      sourceReferences: sourceReferencesSchema(),
    },
  }
  if (taskType === 'rewrite_weekly_reflection') return {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'weekAtGlance', 'whatChanged', 'whatSupportedYou', 'attentionAreas', 'nextWeekFocus', 'suggestedCoachPrompts', 'confidenceNote', 'sourceReferences'],
    properties: {
      headline: commonString,
      weekAtGlance: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'averageScore', 'scoreDirection', 'confidence'],
        properties: {
          summary: commonString,
          averageScore: { type: ['integer', 'null'] },
          scoreDirection: { type: 'string', enum: ['up', 'down', 'stable', 'insufficient_data'] },
          confidence: { type: 'string', enum: ['high', 'moderate', 'low'] },
        },
      },
      whatChanged: weeklyListItemSchema(),
      whatSupportedYou: weeklyListItemSchema(),
      attentionAreas: weeklyListItemSchema(),
      nextWeekFocus: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: { title: commonString, detail: commonString },
      },
      suggestedCoachPrompts: { type: 'array', items: commonString },
      confidenceNote: nullableString,
      sourceReferences: sourceReferencesSchema(),
    },
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'summary', 'factualBasis', 'interpretations', 'primaryAction', 'clarificationQuestion', 'suggestedPrompts', 'confidenceNote', 'sourceReferences'],
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
      clarificationQuestion: nullableString,
      suggestedPrompts: { type: 'array', items: commonString },
      confidenceNote: nullableString,
      sourceReferences: sourceReferencesSchema(),
    },
  }
}

function weeklyListItemSchema() {
  return {
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'explanation', 'sourceReference'],
      properties: {
        title: { type: 'string' },
        explanation: { type: 'string' },
        sourceReference: { type: 'string' },
      },
    },
  }
}

function primaryActionSchema() {
  return {
    type: ['object', 'null'],
    additionalProperties: false,
    required: ['title', 'detail'],
    properties: {
      title: { type: 'string' },
      detail: { type: ['string', 'null'] },
    },
  }
}

function sourceReferencesSchema() {
  return { type: 'array', items: { type: 'string' } }
}

export function getSchemaVersionForTask(taskType: TaskType): string {
  if (taskType === 'rewrite_weekly_reflection') return PHASE_V_C_SCHEMA_VERSION
  if (taskType === 'coach_follow_up' || taskType === 'coach_from_weekly_reflection') return PHASE4B_SCHEMA_VERSION
  return PHASE4A_SCHEMA_VERSION
}
