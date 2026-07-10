import { generateProactiveCandidates } from './candidate-engine.ts'
import { buildProactiveSnapshot, evaluateProactiveAccess, getProactiveSummary, persistInsightCandidates } from './repository.ts'
import type { InsightCandidate, ProactiveGenerationResult, ProactiveRuntimeEnv, ProactiveSupabaseClient } from './types.ts'

export type ProactiveEngineInput = {
  action: 'generate_candidates' | 'get_summary'
}

export type ProactiveEngineResponse = {
  requestId: string
  status: 'completed' | 'disabled'
  reason?: string
  healthDate?: string
  generated?: number
  approved?: number
  suppressed?: number
  candidates: InsightCandidate[]
}

export type ProactiveRuntimeResult = {
  httpStatus: number
  response: ProactiveEngineResponse | { error: { code: string; message: string } }
}

export async function handleProactiveEngineRequest(options: {
  client: ProactiveSupabaseClient
  env: ProactiveRuntimeEnv
  userId: string
  body: unknown
  now?: Date
}): Promise<ProactiveRuntimeResult> {
  const requestId = crypto.randomUUID()
  const parsed = parseInput(options.body)
  if (!parsed.ok) {
    return { httpStatus: 400, response: { error: { code: 'INVALID_REQUEST', message: 'Unsupported proactive engine request.' } } }
  }

  const access = await evaluateProactiveAccess(options.client, options.userId)
  if (!access.enabled) {
    return {
      httpStatus: 200,
      response: { requestId, status: 'disabled', reason: access.reason ?? undefined, candidates: [] },
    }
  }

  if (parsed.input.action === 'get_summary') {
    const candidates = await getProactiveSummary(options.client, options.userId)
    return {
      httpStatus: 200,
      response: { requestId, status: 'completed', candidates },
    }
  }

  const snapshot = await buildProactiveSnapshot(options.client, options.userId, options.now)
  const result = generateProactiveCandidates(snapshot)
  const persisted = await persistInsightCandidates(options.client, result.candidates)
  return {
    httpStatus: 200,
    response: toResponse(requestId, result, persisted),
  }
}

function parseInput(body: unknown): { ok: true; input: ProactiveEngineInput } | { ok: false } {
  if (!body || typeof body !== 'object') return { ok: false }
  const action = (body as { action?: unknown }).action
  if (action !== 'generate_candidates' && action !== 'get_summary') return { ok: false }
  const keys = Object.keys(body)
  if (keys.some((key) => key !== 'action')) return { ok: false }
  return { ok: true, input: { action } }
}

function toResponse(requestId: string, result: ProactiveGenerationResult, candidates: InsightCandidate[]): ProactiveEngineResponse {
  return {
    requestId,
    status: result.status,
    healthDate: result.healthDate,
    generated: result.generated,
    approved: candidates.filter((candidate) => candidate.status === 'approved').length,
    suppressed: candidates.filter((candidate) => candidate.status === 'suppressed').length,
    candidates,
  }
}
