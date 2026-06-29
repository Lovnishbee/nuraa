import type { AIProvider } from './provider.interface.ts'

export class FakeAIProvider implements AIProvider {
  constructor(private readonly fixture: unknown = defaultFixture()) {}

  async generateStructured<T>(): Promise<{ parsed: T; providerRequestId: string; usage: { inputTokens: number; outputTokens: number }; latencyMs: number }> {
    return {
      parsed: this.fixture as T,
      providerRequestId: 'fake-provider-request',
      usage: { inputTokens: 1, outputTokens: 1 },
      latencyMs: 1,
    }
  }

  async healthCheck() {
    return { healthy: true, provider: 'fake', latencyMs: 1 }
  }
}

function defaultFixture() {
  return {
    headline: 'Your Nuraa insight is ready.',
    summary: 'This deterministic test fixture explains the current Nuraa context without changing any scores.',
    primaryAction: { title: 'Keep one steady habit', detail: 'Use your current priority as the next action.' },
    confidenceNote: 'This response came from FakeAIProvider.',
    sourceReferences: ['deterministic:nuraa'],
  }
}
