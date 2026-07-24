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
    maxOutputTokens: 1200,
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
  coach_from_card: {
    ...base,
    version: PHASE4B_SCHEMA_VERSION,
    contextContractVersion: PHASE4B_SCHEMA_VERSION,
    outputSchemaVersion: PHASE4B_SCHEMA_VERSION,
    name: 'coach_from_card',
    taskType: 'coach_from_card',
    modelAlias: 'nuraa_coach_balanced',
    maxOutputTokens: 700,
    checksum: 'phase-v-b-coach-from-card-v1',
  },
}

export const TASK_FLAG_MAP: Record<TaskType, string> = {
  rewrite_daily_brief: 'ENABLE_AI_DAILY_BRIEF',
  explain_score: 'ENABLE_AI_SCORE_EXPLANATION',
  ask_about_today: 'ENABLE_AI_ASK_ABOUT_TODAY',
  coach_follow_up: 'ENABLE_AI_COACH',
  rewrite_weekly_reflection: 'ENABLE_WEEKLY_REFLECTION_AI_COPY',
  coach_from_weekly_reflection: 'ENABLE_AI_COACH',
  coach_from_card: 'ENABLE_CARD_TO_COACH',
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
    coach_from_card: 'CoachFollowUpResponse',
  }[taskType]
}

export function getJsonSchemaForTask(taskType: TaskType): Record<string, unknown> {
  const shortString = textSchema(1, 140)
  const nullableString = nullableTextSchema(280)
  if (taskType === 'rewrite_daily_brief') {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'summary', 'primaryAction', 'confidenceNote', 'sourceReferences'],
      properties: {
        headline: textSchema(1, 140),
        summary: textSchema(1, 700),
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
        headline: textSchema(1, 140),
        summary: textSchema(1, 800),
        factualBasis: {
          type: 'array',
          maxItems: 6,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'sourceReference'],
            properties: { label: textSchema(1, 160), sourceReference: sourceReferenceSchema() },
          },
        },
        interpretations: {
          type: 'array',
          maxItems: 4,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['statement', 'confidence'],
            properties: { statement: textSchema(1, 240), confidence: { type: 'string', enum: ['high', 'moderate', 'low'] } },
          },
        },
        primaryAction: primaryActionSchema(),
        confidenceNote: nullableString,
        followUpQuestions: { type: 'array', maxItems: 3, items: shortString },
        sourceReferences: sourceReferencesSchema(),
      },
    }
  }
  if (taskType === 'ask_about_today') return {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'summary', 'primaryFocus', 'factualBasis', 'suggestedPrompts', 'confidenceNote', 'sourceReferences'],
    properties: {
      headline: textSchema(1, 140),
      summary: textSchema(1, 800),
      primaryFocus: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: { title: textSchema(1, 120), detail: textSchema(1, 260) },
      },
      factualBasis: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'sourceReference'],
          properties: { label: textSchema(1, 160), sourceReference: sourceReferenceSchema() },
        },
      },
      suggestedPrompts: { type: 'array', maxItems: 4, items: shortString },
      confidenceNote: nullableString,
      sourceReferences: sourceReferencesSchema(),
    },
  }
  if (taskType === 'rewrite_weekly_reflection') return {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'weekAtGlance', 'whatChanged', 'whatSupportedYou', 'attentionAreas', 'nextWeekFocus', 'suggestedCoachPrompts', 'confidenceNote', 'sourceReferences'],
    properties: {
      headline: textSchema(1, 120),
      weekAtGlance: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'averageScore', 'scoreDirection', 'confidence'],
        properties: {
          summary: textSchema(1, 600),
          averageScore: { type: ['integer', 'null'] },
          scoreDirection: { type: 'string', enum: ['up', 'down', 'stable', 'insufficient_data'] },
          confidence: { type: 'string', enum: ['high', 'moderate', 'low'] },
        },
      },
      whatChanged: weeklyListItemSchema(3),
      whatSupportedYou: weeklyListItemSchema(3),
      attentionAreas: weeklyListItemSchema(2),
      nextWeekFocus: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: { title: textSchema(1, 120), detail: textSchema(1, 260) },
      },
      suggestedCoachPrompts: { type: 'array', maxItems: 3, items: shortString },
      confidenceNote: nullableString,
      sourceReferences: sourceReferencesSchema(),
    },
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: ['headline', 'summary', 'factualBasis', 'interpretations', 'primaryAction', 'clarificationQuestion', 'suggestedPrompts', 'confidenceNote', 'sourceReferences'],
    properties: {
      headline: textSchema(1, 140),
      summary: textSchema(1, 800),
      factualBasis: {
        type: 'array',
        maxItems: 2,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'sourceReference'],
          properties: { label: textSchema(1, 160), sourceReference: sourceReferenceSchema() },
        },
      },
      interpretations: {
        type: 'array',
        maxItems: 2,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['statement', 'confidence'],
          properties: { statement: textSchema(1, 240), confidence: { type: 'string', enum: ['high', 'moderate', 'low'] } },
        },
      },
      primaryAction: primaryActionSchema(),
      clarificationQuestion: nullableTextSchema(180),
      suggestedPrompts: { type: 'array', maxItems: 3, items: shortString },
      confidenceNote: nullableString,
      sourceReferences: sourceReferencesSchema(),
    },
  }
}

function weeklyListItemSchema(maxItems: number) {
  return {
    type: 'array',
    maxItems,
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'explanation', 'sourceReference'],
      properties: {
        title: textSchema(1, 120),
        explanation: textSchema(1, 280),
        sourceReference: sourceReferenceSchema(),
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
      title: textSchema(1, 120),
      detail: nullableTextSchema(260),
    },
  }
}

function sourceReferencesSchema() {
  return { type: 'array', maxItems: 12, items: sourceReferenceSchema() }
}

function sourceReferenceSchema() {
  return textSchema(1, 120)
}

function textSchema(minLength: number, maxLength: number) {
  return { type: 'string', minLength, maxLength }
}

function nullableTextSchema(maxLength: number) {
  return { type: ['string', 'null'], maxLength }
}

export function getSchemaVersionForTask(taskType: TaskType): string {
  if (taskType === 'rewrite_weekly_reflection') return PHASE_V_C_SCHEMA_VERSION
  if (taskType === 'coach_follow_up' || taskType === 'coach_from_weekly_reflection' || taskType === 'coach_from_card') return PHASE4B_SCHEMA_VERSION
  return PHASE4A_SCHEMA_VERSION
}
