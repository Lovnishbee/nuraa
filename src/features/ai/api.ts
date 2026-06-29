import { invokeAIGateway } from '@/services/aiGateway'
import type { AIGatewayResponse, AIRequestInput } from './types'

export function runInternalAITask(input: Omit<AIRequestInput, 'entryPoint'>): Promise<AIGatewayResponse> {
  return invokeAIGateway({ ...input, entryPoint: 'internal_dev' })
}
