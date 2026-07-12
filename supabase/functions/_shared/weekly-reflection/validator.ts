import { z } from 'zod'
import type { WeeklyReflectionPayload } from './types.ts'

export const WeeklyReflectionPayloadSchema = z.object({
  headline: z.string().min(1).max(120),
  weekAtGlance: z.object({
    summary: z.string().min(1).max(600),
    averageScore: z.number().int().min(0).max(100).nullable(),
    scoreDirection: z.enum(['up', 'down', 'stable', 'insufficient_data']),
    confidence: z.enum(['high', 'moderate', 'low']),
  }).strict(),
  whatChanged: z.array(z.object({
    title: z.string().min(1).max(120),
    explanation: z.string().min(1).max(280),
    sourceReference: z.string().min(1).max(120),
  }).strict()).max(3),
  whatSupportedYou: z.array(z.object({
    title: z.string().min(1).max(120),
    explanation: z.string().min(1).max(280),
    sourceReference: z.string().min(1).max(120),
  }).strict()).max(3),
  attentionAreas: z.array(z.object({
    title: z.string().min(1).max(120),
    explanation: z.string().min(1).max(280),
    sourceReference: z.string().min(1).max(120),
  }).strict()).max(2),
  nextWeekFocus: z.object({
    title: z.string().min(1).max(120),
    detail: z.string().min(1).max(260),
  }).strict(),
  suggestedCoachPrompts: z.array(z.string().min(1).max(140)).max(3),
  confidenceNote: z.string().max(280).nullable(),
  sourceReferences: z.array(z.string().min(1).max(120)).max(12),
}).strict()

const prohibitedPatterns = [
  /\byou are at risk\b/i,
  /\bthis caused\b/i,
  /\byou have\b/i,
  /\byou should take medication\b/i,
  /\bthis indicates disease\b/i,
  /\byou need treatment\b/i,
  /\bdiagnos(e|is|ed)\b/i,
  /\b(start|stop|change|increase|decrease)\s+(your\s+)?(medication|medicine|dose|dosage|tablet|insulin|metformin)\b/i,
]

export function validateWeeklyReflectionPayload(payload: unknown, allowedSourceReferences: string[]) {
  const parsed = WeeklyReflectionPayloadSchema.safeParse(payload)
  if (!parsed.success) return { ok: false as const, errorCode: 'WEEKLY_SCHEMA_VALIDATION_FAILED' }
  if (prohibitedPatterns.some((pattern) => pattern.test(JSON.stringify(parsed.data)))) return { ok: false as const, errorCode: 'WEEKLY_PROHIBITED_CLAIM' }
  const allowed = new Set([...allowedSourceReferences, 'deterministic:nuraa'])
  const referenced = [
    ...parsed.data.sourceReferences,
    ...parsed.data.whatChanged.map((item) => item.sourceReference),
    ...parsed.data.whatSupportedYou.map((item) => item.sourceReference),
    ...parsed.data.attentionAreas.map((item) => item.sourceReference),
  ]
  if (!referenced.every((reference) => allowed.has(reference))) return { ok: false as const, errorCode: 'WEEKLY_INVALID_SOURCE_REFERENCE' }
  return { ok: true as const, payload: parsed.data satisfies WeeklyReflectionPayload }
}

