import { describe, expect, it, vi } from 'vitest'
import { getJsonSchemaForTask } from '../contracts.ts'
import { OpenAIResponsesProvider } from './openai-responses.provider.ts'

describe('OpenAIResponsesProvider', () => {
  it('normalises structured Responses API output and disables storage/tools', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body.store).toBe(false)
      expect(body.tool_choice).toBe('none')
      expect(body.tools).toEqual([])
      expect(body.safety_identifier).toBe('hashed-user')
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
})
