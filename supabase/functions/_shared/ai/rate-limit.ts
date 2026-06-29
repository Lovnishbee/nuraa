import { countRecentExecutions } from './repositories/ai-runtime.repository.ts'
import type { RuntimeSupabaseClient } from './types.ts'

export async function checkRateLimit(options: {
  client: RuntimeSupabaseClient
  userId: string
  windowSeconds: number
  maxRequests: number
  now?: Date
}): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const now = options.now ?? new Date()
  const since = new Date(now.getTime() - options.windowSeconds * 1000).toISOString()
  const count = await countRecentExecutions(options.client, options.userId, since)
  if (count >= options.maxRequests) return { allowed: false, retryAfterSeconds: options.windowSeconds }
  return { allowed: true }
}
