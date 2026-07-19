import type { RuntimeEnv } from '../types.ts'
import type { AIProvider } from './provider.interface.ts'

type FetchLike = typeof fetch

export class OpenAIResponsesProvider implements AIProvider {
  constructor(
    private readonly env: RuntimeEnv,
    private readonly modelResolver: (alias: string) => string | undefined,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async generateStructured<T>(request: {
    modelAlias: string
    instructions: string
    input: unknown
    responseSchemaName: string
    responseSchema: Record<string, unknown>
    maxOutputTokens: number
    safetyIdentifier: string
  }): Promise<{ parsed: T; providerRequestId?: string; usage?: { inputTokens?: number; outputTokens?: number }; latencyMs: number }> {
    const apiKey = this.env.OPENAI_API_KEY
    const model = this.modelResolver(request.modelAlias)
    if (!apiKey) throw providerError('OPENAI_API_KEY_MISSING')
    if (!model) throw providerError('OPENAI_MODEL_NOT_CONFIGURED')
    const started = performance.now()
    const timeoutMs = readPositiveInteger(this.env.AI_PROVIDER_TIMEOUT_MS, 12_000)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response
    try {
      response = await this.fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          instructions: request.instructions,
          input: JSON.stringify({
            ...asRecord(request.input),
            outputInstruction: `Return only valid JSON for ${request.responseSchemaName}.`,
          }),
          max_output_tokens: request.maxOutputTokens,
          store: false,
          safety_identifier: request.safetyIdentifier,
          text: {
            format: {
              type: 'json_schema',
              name: request.responseSchemaName,
              strict: true,
              schema: request.responseSchema,
            },
          },
        }),
      })
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) throw providerError('OPENAI_TIMEOUT')
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
    const latencyMs = Math.round(performance.now() - started)
    if (!response.ok) throw providerError(await parseOpenAIErrorCode(response))
    const json = await response.json() as Record<string, unknown>
    const parsed = parseStructuredOutput<T>(json)
    return {
      parsed,
      providerRequestId: typeof json.id === 'string' ? json.id : undefined,
      usage: parseUsage(json.usage),
      latencyMs,
    }
  }

  async healthCheck() {
    const started = performance.now()
    if (!this.env.OPENAI_API_KEY) return { healthy: false, provider: 'openai', errorCode: 'OPENAI_API_KEY_MISSING' }
    return { healthy: true, provider: 'openai', latencyMs: Math.round(performance.now() - started) }
  }
}

function parseStructuredOutput<T>(json: Record<string, unknown>): T {
  if (typeof json.output_text === 'string') return JSON.parse(json.output_text) as T
  const output = Array.isArray(json.output) ? json.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = (item as Record<string, unknown>).content
    if (!Array.isArray(content)) continue
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue
      const record = contentItem as Record<string, unknown>
      if (typeof record.text === 'string') return JSON.parse(record.text) as T
    }
  }
  throw providerError('OPENAI_OUTPUT_PARSE_FAILED')
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : { input: value }
}

async function parseOpenAIErrorCode(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: { code?: unknown; type?: unknown } }
    const detail = typeof body.error?.code === 'string'
      ? body.error.code
      : typeof body.error?.type === 'string'
        ? body.error.type
        : undefined
    return detail ? `OPENAI_${response.status}_${sanitizeCode(detail)}` : `OPENAI_${response.status}`
  } catch {
    return `OPENAI_${response.status}`
  }
}

function sanitizeCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
}

function parseUsage(value: unknown) {
  if (!value || typeof value !== 'object') return undefined
  const usage = value as Record<string, unknown>
  return {
    inputTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : undefined,
    outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined,
  }
}

function providerError(code: string): Error {
  const error = new Error(code)
  error.name = 'AIProviderError'
  return error
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
