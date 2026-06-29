import type { RuntimeEnv } from './types.ts'

export function readEnvValue(env: RuntimeEnv, key: string): string | undefined {
  return env[key]?.trim() || undefined
}

export function readBooleanEnv(env: RuntimeEnv, key: string, defaultValue = false): boolean {
  const value = readEnvValue(env, key)
  if (!value) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function readNumberEnv(env: RuntimeEnv, key: string, defaultValue: number): number {
  const raw = readEnvValue(env, key)
  if (!raw) return defaultValue
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
}

export function getRuntimeConfig(env: RuntimeEnv) {
  return {
    providerDefault: readEnvValue(env, 'AI_PROVIDER_DEFAULT') ?? 'openai',
    loggingMode: readEnvValue(env, 'AI_LOGGING_MODE') ?? 'minimal',
    safetyPolicyVersion: readEnvValue(env, 'AI_SAFETY_POLICY_VERSION') ?? 'phase4a.v1',
    modelRegistryVersion: readEnvValue(env, 'AI_MODEL_REGISTRY_VERSION') ?? 'phase4a.v1',
    rateLimitWindowSeconds: readNumberEnv(env, 'AI_RATE_LIMIT_WINDOW_SECONDS', 60),
    rateLimitMaxRequests: readNumberEnv(env, 'AI_RATE_LIMIT_MAX_REQUESTS', 10),
    internalAccessRequired: readBooleanEnv(env, 'AI_INTERNAL_ACCESS_REQUIRED', true),
  }
}
