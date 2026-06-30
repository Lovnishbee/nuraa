export type AITaskType = 'rewrite_daily_brief' | 'explain_score' | 'ask_about_today' | 'coach_follow_up'
export type AIEntryPoint = 'internal_dev' | 'future_dashboard' | 'future_coach' | 'dashboard_ask_today' | 'dashboard_score' | 'coach_home' | 'coach_follow_up'
export type AIDetailLevel = 'concise' | 'balanced' | 'detailed'

export type AIRequestInput = {
  taskType: AITaskType
  entryPoint: AIEntryPoint
  conversationId?: string
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

export type CoachResponsePayload = {
  headline?: string
  summary?: string
  primaryFocus?: { title: string; detail?: string }
  primaryAction?: { title: string; detail?: string }
  factualBasis?: Array<{ label: string; sourceReference: string }>
  interpretations?: Array<{ statement: string; confidence: 'high' | 'moderate' | 'low' }>
  suggestedPrompts?: string[]
  followUpQuestions?: string[]
  confidenceNote?: string
  sourceReferences?: string[]
}
