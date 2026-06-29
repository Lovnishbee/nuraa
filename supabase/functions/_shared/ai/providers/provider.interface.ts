export interface AIProvider {
  // Provider abstraction keeps UI/service code stable when Phase 4 swaps local deterministic tests for server AI.
  generateStructured<T>(request: {
    modelAlias: string
    instructions: string
    input: unknown
    responseSchemaName: string
    responseSchema: Record<string, unknown>
    maxOutputTokens: number
    safetyIdentifier: string
  }): Promise<{
    parsed: T
    providerRequestId?: string
    usage?: {
      inputTokens?: number
      outputTokens?: number
    }
    latencyMs: number
  }>

  healthCheck(): Promise<{
    healthy: boolean
    provider: string
    latencyMs?: number
    errorCode?: string
  }>
}
