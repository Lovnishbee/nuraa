export type AITaskType = 'rewrite_daily_brief' | 'explain_score' | 'ask_about_today'
export type AIEntryPoint = 'internal_dev' | 'future_dashboard' | 'future_coach'
export type AIDetailLevel = 'concise' | 'balanced' | 'detailed'

export type AIRequestInput = {
  taskType: AITaskType
  entryPoint: AIEntryPoint
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
  contextExpiresAt?: string
  payload: unknown
  safeMeta: {
    responseSchemaVersion: string
    promptContractVersion?: string
    schemaValidationPassed?: boolean
    latencyMs?: number
  }
}
