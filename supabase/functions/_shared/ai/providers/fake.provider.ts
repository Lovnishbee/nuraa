import type { AIProvider } from './provider.interface.ts'
import type { AIResponsePayload } from '../types.ts'

export class FakeAIProvider implements AIProvider {
  constructor(private readonly fixture?: unknown) {}

  async generateStructured<T>(request: Parameters<AIProvider['generateStructured']>[0]): Promise<{ parsed: T; providerRequestId: string; usage: { inputTokens: number; outputTokens: number }; latencyMs: number }> {
    return {
      parsed: (this.fixture ?? fixtureForResponseSchema(request.responseSchemaName)) as T,
      providerRequestId: 'fake-provider-request',
      usage: { inputTokens: 1, outputTokens: 1 },
      latencyMs: 1,
    }
  }

  async healthCheck() {
    return { healthy: true, provider: 'fake', latencyMs: 1 }
  }
}

function fixtureForResponseSchema(responseSchemaName: string): AIResponsePayload {
  if (responseSchemaName === 'DailyBriefRewriteResponse') {
    return {
      headline: 'Your Nuraa brief is ready.',
      summary: 'Today looks best served by one calm, steady action based on your current Nuraa context.',
      primaryAction: { title: 'Keep one steady habit', detail: 'Choose the smallest useful action and protect it.' },
      confidenceNote: 'This response came from FakeAIProvider.',
      sourceReferences: ['deterministic:nuraa'],
    }
  }

  if (responseSchemaName === 'ExplainScoreResponse') {
    return {
      headline: 'Your readiness is based on today’s signals.',
      summary: 'Nuraa is using the current deterministic score context to explain the main readiness pattern.',
      factualBasis: [{ label: 'Deterministic Nuraa context', sourceReference: 'deterministic:nuraa' }],
      interpretations: [{ statement: 'A steady routine is the most reliable next step.', confidence: 'low' }],
      primaryAction: { title: 'Protect one routine', detail: 'Keep the next action simple and repeatable.' },
      confidenceNote: 'This response came from FakeAIProvider.',
      followUpQuestions: ['What should I focus on today?'],
      sourceReferences: ['deterministic:nuraa'],
    }
  }

  if (responseSchemaName === 'AskAboutTodayResponse') {
    return {
      headline: 'Focus on one steady action today.',
      summary: 'Your current Nuraa context supports a calm, practical plan instead of adding intensity.',
      primaryFocus: { title: 'Take a breathing break', detail: 'Use two quiet minutes before your next demanding block.' },
      factualBasis: [{ label: 'Deterministic Nuraa context', sourceReference: 'deterministic:nuraa' }],
      suggestedPrompts: ['Why is this my focus today?', 'What is one simple action I can take?'],
      confidenceNote: 'This response came from FakeAIProvider.',
      sourceReferences: ['deterministic:nuraa'],
    }
  }

  return {
    headline: 'Keep the next step simple.',
    summary: 'Based on the visible Nuraa context, a small steady action is the most useful response right now.',
    factualBasis: [{ label: 'Deterministic Nuraa context', sourceReference: 'deterministic:nuraa' }],
    interpretations: [{ statement: 'The current context supports a calmer next step.', confidence: 'low' }],
    primaryAction: { title: 'Take a short reset', detail: 'Pause for two minutes, then return to the next essential task.' },
    clarificationQuestion: null,
    suggestedPrompts: ['Why this focus?', 'What data is missing from my baseline?'],
    confidenceNote: 'This response came from FakeAIProvider.',
    sourceReferences: ['deterministic:nuraa'],
  }
}
