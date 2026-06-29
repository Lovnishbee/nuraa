import { z } from 'zod'

export const TaskTypeSchema = z.enum(['rewrite_daily_brief', 'explain_score', 'ask_about_today'])
export const EntryPointSchema = z.enum(['internal_dev', 'future_dashboard', 'future_coach'])
export const DetailLevelSchema = z.enum(['concise', 'balanced', 'detailed'])
export const SafetyRouteSchema = z.enum(['S0_routine_wellness', 'S1_medical_boundary', 'S2_timely_professional_review', 'S3_immediate_safety_or_emergency'])

export const AIRequestInputSchema = z.object({
  taskType: TaskTypeSchema,
  entryPoint: EntryPointSchema,
  detailLevel: DetailLevelSchema.optional(),
  userInput: z.object({
    question: z.string().trim().min(1).max(500).optional(),
  }).strict().optional(),
  idempotencyKey: z.string().trim().min(8).max(128).regex(/^[a-zA-Z0-9:_-]+$/).optional(),
}).strict()

export const SourceReferencesSchema = z.array(z.string().min(1).max(120)).max(12)

export const PrimaryActionSchema = z.object({
  title: z.string().min(1).max(120),
  detail: z.string().max(260).optional(),
}).strict()

export const DailyBriefRewriteResponseSchema = z.object({
  headline: z.string().min(1).max(140),
  summary: z.string().min(1).max(700),
  primaryAction: PrimaryActionSchema.optional(),
  confidenceNote: z.string().max(280).optional(),
  sourceReferences: SourceReferencesSchema,
}).strict()

export const ExplainScoreResponseSchema = z.object({
  headline: z.string().min(1).max(140),
  summary: z.string().min(1).max(800),
  factualBasis: z.array(z.object({
    label: z.string().min(1).max(160),
    sourceReference: z.string().min(1).max(120),
  }).strict()).max(6),
  interpretations: z.array(z.object({
    statement: z.string().min(1).max(240),
    confidence: z.enum(['high', 'moderate', 'low']),
  }).strict()).max(4),
  primaryAction: PrimaryActionSchema.optional(),
  confidenceNote: z.string().max(280).optional(),
  followUpQuestions: z.array(z.string().min(1).max(140)).max(3),
  sourceReferences: SourceReferencesSchema,
}).strict()

export const AskAboutTodayResponseSchema = z.object({
  headline: z.string().min(1).max(140),
  summary: z.string().min(1).max(800),
  primaryFocus: z.object({
    title: z.string().min(1).max(120),
    detail: z.string().min(1).max(260),
  }).strict(),
  factualBasis: z.array(z.object({
    label: z.string().min(1).max(160),
    sourceReference: z.string().min(1).max(120),
  }).strict()).max(6),
  suggestedPrompts: z.array(z.string().min(1).max(140)).max(4),
  confidenceNote: z.string().max(280).optional(),
  sourceReferences: SourceReferencesSchema,
}).strict()

export const TimeOfDaySchema = z.enum(['morning', 'afternoon', 'evening', 'night'])

export const ContextEnvelopeSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.literal('phase4a.v1'),
  taskType: TaskTypeSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  currentMoment: z.object({
    healthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: z.string().min(1),
    timeOfDay: TimeOfDaySchema,
  }).strict(),
  userPreferences: z.object({
    coachingDetailLevel: DetailLevelSchema,
    coachingTone: z.enum(['calm', 'encouraging', 'scientific', 'direct']),
  }).strict(),
  currentHealthState: z.record(z.unknown()),
  relevantTrends: z.array(z.record(z.unknown())).max(7),
  activePriorities: z.array(z.record(z.unknown())).max(3),
  activeGoals: z.array(z.record(z.unknown())).max(3),
  confidenceNotes: z.array(z.string().max(200)).max(6),
  missingInformation: z.array(z.string().max(160)).max(8),
  sourceReferences: SourceReferencesSchema,
  explanationPaths: z.array(z.record(z.unknown())).max(8),
  safetyConstraints: z.object({
    medicalAdviceProhibited: z.literal(true),
    medicationAdviceProhibited: z.literal(true),
    diagnosisProhibited: z.literal(true),
  }).strict(),
}).strict()

export const PromptContractSchema = z.object({
  name: TaskTypeSchema,
  version: z.literal('phase4a.v1'),
  taskType: TaskTypeSchema,
  safetyPolicyVersion: z.literal('phase4a.v1'),
  contextContractVersion: z.literal('phase4a.v1'),
  outputSchemaVersion: z.literal('phase4a.v1'),
  maxOutputTokens: z.number().int().positive(),
  modelAlias: z.string().min(1),
  checksum: z.string().min(1),
}).strict()

export const AIGatewayResponseSchema = z.object({
  requestId: z.string().uuid(),
  taskType: TaskTypeSchema,
  status: z.enum(['completed', 'fallback', 'safety_routed', 'disabled']),
  fallbackUsed: z.boolean(),
  contextExpiresAt: z.string().datetime().optional(),
  payload: z.unknown(),
  safeMeta: z.object({
    responseSchemaVersion: z.string(),
    promptContractVersion: z.string().optional(),
    schemaValidationPassed: z.boolean().optional(),
    latencyMs: z.number().int().nonnegative().optional(),
  }).strict(),
}).strict()
