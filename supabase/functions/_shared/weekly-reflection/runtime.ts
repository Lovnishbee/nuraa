import { buildDeterministicWeeklyReflectionPayload, buildWeeklyReflectionMetrics } from './weekly-metrics.ts'
import { buildWeeklyReflectionSnapshot, evaluateWeeklyReflectionAccess, getCurrentWeeklyReflection, getOwnedWeeklyReflection, persistWeeklyReflection, updateWeeklyReflectionLifecycle } from './repository.ts'
import { validateWeeklyReflectionPayload } from './validator.ts'
import type { WeeklyReflection, WeeklyReflectionRuntimeEnv, WeeklyReflectionSupabaseClient } from './types.ts'

export type WeeklyReflectionEngineInput =
  | { action: 'generate_weekly_reflection' }
  | { action: 'get_current_weekly_reflection' }
  | { action: 'mark_viewed'; reflectionId: string }
  | { action: 'dismiss_reflection'; reflectionId: string }
  | { action: 'start_coach_handoff'; reflectionId: string }

export type WeeklyReflectionEngineResponse = {
  requestId: string
  status: 'completed' | 'disabled'
  reason?: string
  reflection: WeeklyReflection | null
}

export type WeeklyReflectionRuntimeResult = {
  httpStatus: number
  response: WeeklyReflectionEngineResponse | { error: { code: string; message: string } }
}

export async function handleWeeklyReflectionRequest(options: {
  client: WeeklyReflectionSupabaseClient
  env: WeeklyReflectionRuntimeEnv
  userId: string
  body: unknown
  now?: Date
}): Promise<WeeklyReflectionRuntimeResult> {
  const requestId = crypto.randomUUID()
  const parsed = parseInput(options.body)
  if (!parsed.ok) return { httpStatus: 400, response: { error: { code: 'INVALID_REQUEST', message: 'Weekly reflection request is invalid.' } } }

  const access = await evaluateWeeklyReflectionAccess(options.client, options.env, options.userId)
  if (!access.enabled) return { httpStatus: 200, response: { requestId, status: 'disabled', reason: access.reason ?? undefined, reflection: null } }

  if (parsed.input.action === 'get_current_weekly_reflection') {
    const reflection = await getCurrentWeeklyReflection(options.client, options.userId, options.now)
    return { httpStatus: 200, response: { requestId, status: 'completed', reflection } }
  }

  if (parsed.input.action === 'mark_viewed') {
    const reflection = await updateWeeklyReflectionLifecycle(options.client, options.userId, parsed.input.reflectionId, { status: 'viewed', viewed_at: new Date().toISOString() })
    return { httpStatus: 200, response: { requestId, status: 'completed', reflection } }
  }

  if (parsed.input.action === 'dismiss_reflection') {
    const reflection = await updateWeeklyReflectionLifecycle(options.client, options.userId, parsed.input.reflectionId, { status: 'dismissed', dismissed_at: new Date().toISOString() })
    return { httpStatus: 200, response: { requestId, status: 'completed', reflection } }
  }

  if (parsed.input.action === 'start_coach_handoff') {
    const existing = await getOwnedWeeklyReflection(options.client, options.userId, parsed.input.reflectionId)
    if (!existing) return { httpStatus: 404, response: { error: { code: 'NOT_FOUND', message: 'Weekly reflection was not found.' } } }
    const reflection = await updateWeeklyReflectionLifecycle(options.client, options.userId, parsed.input.reflectionId, { status: 'converted_to_coach', converted_to_coach_at: new Date().toISOString() })
    return { httpStatus: 200, response: { requestId, status: 'completed', reflection } }
  }

  const snapshot = await buildWeeklyReflectionSnapshot(options.client, options.userId, options.now)
  const metrics = buildWeeklyReflectionMetrics(snapshot)
  const payload = buildDeterministicWeeklyReflectionPayload(metrics)
  const validation = validateWeeklyReflectionPayload(payload, metrics.sourceReferences.map((reference) => reference.sourceReference))
  if (!validation.ok) return { httpStatus: 500, response: { error: { code: validation.errorCode, message: 'Weekly reflection could not be generated safely.' } } }
  const reflection = await persistWeeklyReflection(options.client, {
    userId: options.userId,
    metrics,
    payload: validation.payload,
    sourceReferences: metrics.sourceReferences,
  })
  return { httpStatus: 200, response: { requestId, status: 'completed', reflection } }
}

function parseInput(body: unknown): { ok: true; input: WeeklyReflectionEngineInput } | { ok: false } {
  if (!body || typeof body !== 'object') return { ok: false }
  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.some((key) => !['action', 'reflectionId'].includes(key))) return { ok: false }
  if (record.action === 'generate_weekly_reflection' || record.action === 'get_current_weekly_reflection') return { ok: true, input: { action: record.action } }
  if (['mark_viewed', 'dismiss_reflection', 'start_coach_handoff'].includes(String(record.action)) && isUuid(record.reflectionId)) {
    return { ok: true, input: { action: record.action as 'mark_viewed' | 'dismiss_reflection' | 'start_coach_handoff', reflectionId: record.reflectionId } }
  }
  return { ok: false }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

