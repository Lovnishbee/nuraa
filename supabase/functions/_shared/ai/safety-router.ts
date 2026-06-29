import type { AIResponsePayload, SafetyDecision, SafetyRoute, TaskType } from './types.ts'

export const SAFETY_POLICY_VERSION = 'phase4a.v1'

export const SAFETY_MESSAGES: Record<Exclude<SafetyRoute, 'S0_routine_wellness'>, string> = {
  S1_medical_boundary: 'Nuraa cannot diagnose a condition or advise you to start, stop, or change medication. A qualified healthcare professional or pharmacist can help you assess this safely.',
  S2_timely_professional_review: 'Nuraa cannot determine what is causing this. Because it sounds persistent, worsening, or disruptive, it would be sensible to speak with a qualified healthcare professional soon.',
  S3_immediate_safety_or_emergency: 'I cannot assess this safely through Nuraa. Please seek immediate in-person help now by contacting local emergency services or going to the nearest emergency care facility. If someone you trust is nearby, ask them to stay with you or help you get care.',
}

const s3Patterns = [
  /\b(chest pain|can't breathe|cannot breathe|suicide|kill myself|self harm|overdose|stroke|unconscious|seizure)\b/i,
]

const s2Patterns = [
  /\b(worsening|persistent|won't stop|for weeks|severe pain|fainting|blood in|high fever)\b/i,
]

const s1Patterns = [
  /\b(diagnose|diagnosis|medication|medicine|tablet|dose|dosage|prescription|insulin|metformin|thyroid medicine|stop taking|start taking)\b/i,
]

export function routeSafety(taskType: TaskType, question?: string): SafetyDecision {
  const text = question?.trim() ?? ''
  const route = classifySafetyRoute(text)
  if (route === 'S0_routine_wellness') return { route, shouldCallProvider: true }
  return { route, shouldCallProvider: false, response: safetyFallbackForTask(taskType, route) }
}

export function classifySafetyRoute(text: string): SafetyRoute {
  if (!text) return 'S0_routine_wellness'
  if (s3Patterns.some((pattern) => pattern.test(text))) return 'S3_immediate_safety_or_emergency'
  if (s2Patterns.some((pattern) => pattern.test(text))) return 'S2_timely_professional_review'
  if (s1Patterns.some((pattern) => pattern.test(text))) return 'S1_medical_boundary'
  return 'S0_routine_wellness'
}

function safetyFallbackForTask(taskType: TaskType, route: Exclude<SafetyRoute, 'S0_routine_wellness'>): AIResponsePayload {
  const message = SAFETY_MESSAGES[route]
  if (taskType === 'rewrite_daily_brief') {
    return {
      headline: 'Safety boundary',
      summary: message,
      confidenceNote: 'Nuraa uses deterministic safety routing for this response.',
      sourceReferences: ['safety_policy:phase4a.v1'],
    }
  }
  if (taskType === 'explain_score') {
    return {
      headline: 'Safety boundary',
      summary: message,
      factualBasis: [{ label: 'Safety policy route', sourceReference: 'safety_policy:phase4a.v1' }],
      interpretations: [{ statement: 'This is a safety routing response, not a diagnosis.', confidence: 'high' }],
      followUpQuestions: [],
      sourceReferences: ['safety_policy:phase4a.v1'],
    }
  }
  return {
    headline: 'Safety boundary',
    summary: message,
    primaryFocus: { title: 'Use appropriate care', detail: message },
    factualBasis: [{ label: 'Safety policy route', sourceReference: 'safety_policy:phase4a.v1' }],
    suggestedPrompts: [],
    sourceReferences: ['safety_policy:phase4a.v1'],
  }
}
