export type AITaskType = 'rewrite_daily_brief' | 'explain_score' | 'ask_about_today' | 'coach_follow_up' | 'rewrite_weekly_reflection' | 'coach_from_weekly_reflection' | 'coach_from_card'
export type AIEntryPoint = 'internal_dev' | 'future_dashboard' | 'future_coach' | 'dashboard_ask_today' | 'dashboard_score' | 'coach_home' | 'coach_follow_up' | 'weekly_reflection' | 'weekly_reflection_to_coach' | 'proactive_card_to_coach'
export type AIDetailLevel = 'concise' | 'balanced' | 'detailed'

export type AIRequestInput = {
  taskType: AITaskType
  entryPoint: AIEntryPoint
  conversationId?: string
  weeklyReflectionId?: string
  cardId?: string
  detailLevel?: AIDetailLevel
  userInput?: {
    question?: string
  }
  idempotencyKey?: string
}

export type AIGatewayResponse = {
  requestId: string
  taskType: AITaskType
  status: 'completed' | 'fallback' | 'safety_routed' | 'disabled'
  fallbackUsed: boolean
  conversationId?: string
  messageId?: string
  contextExpiresAt?: string
  payload: unknown
  safeMeta: {
    responseSchemaVersion: string
    promptContractVersion?: string
    schemaValidationPassed?: boolean
    latencyMs?: number
  }
}

export type AIInternalAccessStatus = {
  enabled: boolean
  consentGranted: boolean
}

export type CoachSourceReference = {
  label: string
  sourceReference: string
}

export type CoachInterpretation = {
  statement: string
  confidence: 'high' | 'moderate' | 'low'
}

export type CoachPrimaryAction = {
  title: string
  detail: string | null
}

export type CoachPrimaryFocus = {
  title: string
  detail: string
}

export type CoachResponsePayload = {
  headline?: string
  summary?: string
  factualBasis?: CoachSourceReference[]
  interpretations?: CoachInterpretation[]
  primaryAction?: CoachPrimaryAction | null
  primaryFocus?: CoachPrimaryFocus
  clarificationQuestion?: string | null
  suggestedPrompts?: string[]
  confidenceNote?: string | null
  followUpQuestions?: string[]
  sourceReferences?: string[]
}
