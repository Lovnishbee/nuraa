import { readBooleanEnv } from './config.ts'
import { TASK_FLAG_MAP } from './contracts.ts'
import type { AIRequestInput, RuntimeEnv, RuntimeSupabaseClient, TaskType } from './types.ts'

export type FeatureFlagResult =
  | { enabled: true }
  | { enabled: false; reason: 'ai_disabled' | 'task_disabled' | 'internal_tests_disabled' | 'not_internal_tester' | 'consent_missing' }

export async function evaluateFeatureAccess(options: {
  client: RuntimeSupabaseClient
  env: RuntimeEnv
  userId: string
  input: AIRequestInput
}): Promise<FeatureFlagResult> {
  const aiEnabled = await isFeatureEnabled(options.client, options.env, 'AI_ENABLED')
  if (!aiEnabled) return { enabled: false, reason: 'ai_disabled' }

  const taskEnabled = await isFeatureEnabled(options.client, options.env, TASK_FLAG_MAP[options.input.taskType])
  if (!taskEnabled) return { enabled: false, reason: 'task_disabled' }

  if (options.input.entryPoint === 'internal_dev') {
    const internalEnabled = await isFeatureEnabled(options.client, options.env, 'ENABLE_AI_INTERNAL_TESTS')
    if (!internalEnabled) return { enabled: false, reason: 'internal_tests_disabled' }
  }

  if (readBooleanEnv(options.env, 'AI_INTERNAL_ACCESS_REQUIRED', true)) {
    const access = await getInternalTesterAccess(options.client, options.userId)
    if (!access.enabled) return { enabled: false, reason: 'not_internal_tester' }
    if (!access.consent_granted) return { enabled: false, reason: 'consent_missing' }
  }

  return { enabled: true }
}

export async function isFeatureEnabled(client: RuntimeSupabaseClient, env: RuntimeEnv, featureName: string): Promise<boolean> {
  if (!readBooleanEnv(env, featureName, false)) return false
  const result = await client.from('ai_feature_flags').select('enabled').eq('feature_name', featureName).maybeSingle<{ enabled: boolean }>()
  if (result.error) return false
  return Boolean(result.data?.enabled)
}

async function getInternalTesterAccess(client: RuntimeSupabaseClient, userId: string): Promise<{ enabled: boolean; consent_granted: boolean }> {
  const result = await client.from('ai_internal_testers').select('enabled, consent_granted').eq('user_id', userId).maybeSingle<{ enabled: boolean; consent_granted: boolean }>()
  if (result.error || !result.data) return { enabled: false, consent_granted: false }
  return result.data
}

export function flagForTask(taskType: TaskType): string {
  return TASK_FLAG_MAP[taskType]
}
