import type { DailyCheckInInput } from './checkins'
import { generateForCheckin, type CheckInIntelligenceSaveResult } from './intelligence'

export type { CheckInIntelligenceSaveResult }

export async function saveDailyCheckInWithIntelligence(userId: string, input: DailyCheckInInput): Promise<CheckInIntelligenceSaveResult> {
  return generateForCheckin(userId, input)
}
