import { describe, expect, it, vi } from 'vitest'
import { getJsonSchemaForTask } from '../contracts.ts'
import { OpenAIResponsesProvider } from './openai-responses.provider.ts'

describe('OpenAIResponsesProvider', () => {
  it('normalises structured Responses API output and disables storage/tools', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body.store).toBe(false)
      expect(body.tool_choice).toBeUndefined()
      expect(body.tools).toBeUndefined()
      expect(body.safety_identifier).toBe('hashed-user')
      const input = JSON.parse(String(body.input)) as Record<string, unknown>
      expect(input.outputInstruction).toContain('Return only valid JSON')
      const text = body.text as Record<string, unknown>
      const format = text.format as Record<string, unknown>
      expect(format.strict).toBe(true)
      expect(format.schema).toMatchObject({ type: 'object', additionalProperties: false })
      return new Response(JSON.stringify({
        id: 'resp_123',
        output_text: JSON.stringify({ headline: 'Ready', summary: 'Structured output', sourceReferences: ['deterministic:nuraa'] }),
        usage: { input_tokens: 10, output_tokens: 8 },
      }), { status: 200 })
    })
    const provider = new OpenAIResponsesProvider({ OPENAI_API_KEY: 'test' }, () => 'model-test', fetcher as typeof fetch)
    const result = await provider.generateStructured<{ headline: string }>({
      modelAlias: 'nuraa_fast_structured',
      instructions: 'Rules',
      input: { task: 'test' },
      responseSchemaName: 'DailyBriefRewriteResponse',
      responseSchema: getJsonSchemaForTask('rewrite_daily_brief'),
      maxOutputTokens: 100,
      safetyIdentifier: 'hashed-user',
    })

    expect(result.parsed.headline).toBe('Ready')
    expect(result.usage?.inputTokens).toBe(10)
  })

  it('aborts slow provider requests so the gateway can fall back', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const provider = new OpenAIResponsesProvider({ OPENAI_API_KEY: 'test', AI_PROVIDER_TIMEOUT_MS: '10' }, () => 'model-test', fetcher as typeof fetch)

    const request = provider.generateStructured<{ headline: string }>({
      modelAlias: 'nuraa_fast_structured',
      instructions: 'Rules',
      input: { task: 'test' },
      responseSchemaName: 'DailyBriefRewriteResponse',
      responseSchema: getJsonSchemaForTask('rewrite_daily_brief'),
      maxOutputTokens: 100,
      safetyIdentifier: 'hashed-user',
    })

    const expectation = expect(request).rejects.toThrow('OPENAI_TIMEOUT')
    await vi.advanceTimersByTimeAsync(10)
    await expectation
    vi.useRealTimers()
  })

  it('maps malformed structured output to a stable provider error code', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: 'resp_bad_json',
      output_text: '{"headline":"Ready"',
    }), { status: 200 }))
    const provider = new OpenAIResponsesProvider({ OPENAI_API_KEY: 'test' }, () => 'model-test', fetcher as typeof fetch)

    await expect(provider.generateStructured<{ headline: string }>({
      modelAlias: 'nuraa_fast_structured',
      instructions: 'Rules',
      input: { task: 'test' },
      responseSchemaName: 'DailyBriefRewriteResponse',
      responseSchema: getJsonSchemaForTask('rewrite_daily_brief'),
      maxOutputTokens: 100,
      safetyIdentifier: 'hashed-user',
    })).rejects.toThrow('OPENAI_OUTPUT_PARSE_FAILED')
  })

  it('maps incomplete Responses API output to a stable provider error code', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: 'resp_incomplete',
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      output_text: '{"headline":"Ready"',
    }), { status: 200 }))
    const provider = new OpenAIResponsesProvider({ OPENAI_API_KEY: 'test' }, () => 'model-test', fetcher as typeof fetch)

    await expect(provider.generateStructured<{ headline: string }>({
      modelAlias: 'nuraa_fast_structured',
      instructions: 'Rules',
      input: { task: 'test' },
      responseSchemaName: 'DailyBriefRewriteResponse',
      responseSchema: getJsonSchemaForTask('rewrite_daily_brief'),
      maxOutputTokens: 100,
      safetyIdentifier: 'hashed-user',
    })).rejects.toThrow('OPENAI_OUTPUT_INCOMPLETE_max_output_tokens')
  })
})
