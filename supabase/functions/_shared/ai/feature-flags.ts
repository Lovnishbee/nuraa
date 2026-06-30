import { readBooleanEnv } from './config.ts'
import { TASK_FLAG_MAP } from './contracts.ts'
import type { AIRequestInput, RuntimeEnv, RuntimeSupabaseClient, TaskType } from './types.ts'

export type FeatureFlagResult =
  | { enabled: true }
  | { enabled: false; reason: 'ai_disabled' | 'task_disabled' | 'coach_disabled' | 'dashboard_entry_disabled' | 'internal_tests_disabled' | 'not_internal_tester' | 'consent_missing' | 'coach_consent_missing' }

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
  } else {
    const coachEnabled = await isFeatureEnabled(options.client, options.env, 'ENABLE_AI_COACH')
    if (!coachEnabled) return { enabled: false, reason: 'coach_disabled' }
    if ((options.input.entryPoint === 'dashboard_ask_today' || options.input.entryPoint === 'dashboard_score')) {
      const dashboardEntryEnabled = await isFeatureEnabled(options.client, options.env, 'ENABLE_AI_COACH_DASHBOARD_ENTRY')
      if (!dashboardEntryEnabled) return { enabled: false, reason: 'dashboard_entry_disabled' }
    }
  }

  if (readBooleanEnv(options.env, 'AI_INTERNAL_ACCESS_REQUIRED', true)) {
    const access = await getInternalTesterAccess(options.client, options.userId)
    if (!access.enabled) return { enabled: false, reason: 'not_internal_tester' }
    if (!access.consent_granted) return { enabled: false, reason: 'consent_missing' }
  }

  if (options.input.entryPoint !== 'internal_dev') {
    const preferences = await getUserAIPreferences(options.client, options.userId)
    if (!preferences.ai_coaching_enabled) return { enabled: false, reason: 'coach_consent_missing' }
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

async function getUserAIPreferences(client: RuntimeSupabaseClient, userId: string): Promise<{ ai_coaching_enabled: boolean }> {
  const result = await client.from('user_ai_preferences').select('ai_coaching_enabled').eq('user_id', userId).maybeSingle<{ ai_coaching_enabled: boolean }>()
  if (result.error || !result.data) return { ai_coaching_enabled: false }
  return { ai_coaching_enabled: Boolean(result.data.ai_coaching_enabled) }
}

export function flagForTask(taskType: TaskType): string {
  return TASK_FLAG_MAP[taskType]
}
