import { stableJsonHash } from './hash.ts'
import { completeExecution, createExecution, persistValidatedResponse } from './repositories/ai-runtime.repository.ts'
import type { AIResponsePayload, RuntimeSupabaseClient, TaskType } from './types.ts'

export async function startAuditExecution(client: RuntimeSupabaseClient, values: Parameters<typeof createExecution>[1]) {
  return createExecution(client, values)
}

export async function finishAuditExecution(client: RuntimeSupabaseClient, values: {
  executionId: string
  taskType: TaskType
  payload: AIResponsePayload
  status: string
  fallbackUsed: boolean
  latencyMs?: number
  inputTokens?: number
  outputTokens?: number
  errorCode?: string | null
}) {
  await completeExecution(client, {
    executionId: values.executionId,
    status: values.status,
    fallbackUsed: values.fallbackUsed,
    latencyMs: values.latencyMs,
    inputTokens: values.inputTokens,
    outputTokens: values.outputTokens,
    errorCode: values.errorCode,
  })
  await persistValidatedResponse(client, {
    executionId: values.executionId,
    schemaVersion: 'phase4a.v1',
    payload: values.payload,
    responseHash: await stableJsonHash(values.payload),
  })
}
