import type { z } from 'zod'
import type {
  AIGatewayResponseSchema,
  AIRequestInputSchema,
  AskAboutTodayResponseSchema,
  CoachFollowUpResponseSchema,
  ContextEnvelopeSchema,
  DailyBriefRewriteResponseSchema,
  ExplainScoreResponseSchema,
  PromptContractSchema,
} from './schemas.ts'

export const PHASE4A_SCHEMA_VERSION = 'phase4a.v1'

export type TaskType = 'rewrite_daily_brief' | 'explain_score' | 'ask_about_today' | 'coach_follow_up'
export type EntryPoint = 'internal_dev' | 'future_dashboard' | 'future_coach' | 'dashboard_ask_today' | 'dashboard_score' | 'coach_home' | 'coach_follow_up'
export type DetailLevel = 'concise' | 'balanced' | 'detailed'
export type SafetyRoute = 'S0_routine_wellness' | 'S1_medical_boundary' | 'S2_timely_professional_review' | 'S3_immediate_safety_or_emergency'
export type GatewayStatus = 'completed' | 'fallback' | 'safety_routed' | 'disabled'

export type AIRequestInput = z.infer<typeof AIRequestInputSchema>
export type AIGatewayResponse = z.infer<typeof AIGatewayResponseSchema>
export type ContextEnvelope = z.infer<typeof ContextEnvelopeSchema>
export type DailyBriefRewriteResponse = z.infer<typeof DailyBriefRewriteResponseSchema>
export type ExplainScoreResponse = z.infer<typeof ExplainScoreResponseSchema>
export type AskAboutTodayResponse = z.infer<typeof AskAboutTodayResponseSchema>
export type CoachFollowUpResponse = z.infer<typeof CoachFollowUpResponseSchema>
export type PromptContract = z.infer<typeof PromptContractSchema>
export type AIResponsePayload = DailyBriefRewriteResponse | ExplainScoreResponse | AskAboutTodayResponse | CoachFollowUpResponse

export type SafeMeta = AIGatewayResponse['safeMeta']

export type RuntimeEnv = Record<string, string | undefined>

export type RuntimeSupabaseClient = {
  auth?: {
    getUser: (jwt?: string) => Promise<{ data?: { user?: { id: string; email?: string | null } | null }; error?: { message?: string } | null }>
  }
  from: (table: string) => RuntimeQueryBuilder
}

export type RuntimeQueryBuilder = {
  select: (columns?: string) => RuntimeQueryBuilder
  insert: (values: unknown) => RuntimeQueryBuilder
  update: (values: unknown) => RuntimeQueryBuilder
  upsert: (values: unknown, options?: unknown) => RuntimeQueryBuilder
  delete: () => RuntimeQueryBuilder
  eq: (column: string, value: unknown) => RuntimeQueryBuilder
  in: (column: string, values: unknown[]) => RuntimeQueryBuilder
  gte: (column: string, value: unknown) => RuntimeQueryBuilder
  lt: (column: string, value: unknown) => RuntimeQueryBuilder
  order: (column: string, options?: unknown) => RuntimeQueryBuilder
  limit: (count: number) => RuntimeQueryBuilder
  maybeSingle: <T = unknown>() => Promise<{ data: T | null; error: RuntimeDbError | null }>
  single: <T = unknown>() => Promise<{ data: T; error: RuntimeDbError | null }>
  then: <TResult1 = { data: unknown[] | null; error: RuntimeDbError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[] | null; error: RuntimeDbError | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => PromiseLike<TResult1 | TResult2>
}

export type RuntimeDbError = { message: string; code?: string }

export type ModelPolicy = {
  id: string
  alias: string
  provider: string
  model_env_key: string
  allowed_task_types: string[]
  structured_output_enabled: boolean
  streaming_enabled: boolean
  status: string
}

export type PromptContractRow = {
  id: string
  name: string
  version: string
  task_type: TaskType
  safety_policy_version: string
  context_contract_version: string
  output_schema_version: string
  tool_permissions: unknown
  token_budget: { maxOutputTokens?: number } | unknown
  fallback_strategy: unknown
  content_checksum: string
  rollout_status: string
}

export type RuntimeDataSnapshot = {
  profile: {
    id: string
    timezone: string | null
    full_name?: string | null
  } | null
  score: Record<string, unknown> | null
  previousScore: Record<string, unknown> | null
  signal: Record<string, unknown> | null
  brief: {
    id: string
    headline: string | null
    summary: string | null
    focus_items: unknown
    insight: string | null
    brief_date: string
  } | null
  factors: Record<string, unknown> | null
  insights: Array<Record<string, unknown>>
  goals: Array<Record<string, unknown>>
  coachMessages?: Array<{
    role: 'user' | 'nuraa'
    message_type: string
    content: string | null
    structured_payload: unknown | null
    created_at: string
  }>
}

export type PromptAssembly = {
  instructions: string
  input: Record<string, unknown>
  promptContractVersion: string
  maxOutputTokens: number
  modelAlias: string
}

export type ValidationResult<T extends AIResponsePayload = AIResponsePayload> =
  | { ok: true; payload: T; schemaVersion: string }
  | { ok: false; errorCode: string }

export type SafetyDecision = {
  route: SafetyRoute
  shouldCallProvider: boolean
  response?: AIResponsePayload
}

export type RuntimeResult = {
  response: AIGatewayResponse
  httpStatus: number
}
