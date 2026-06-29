import type { DailyCheckin } from '@/types/database'
import { saveDailyCheckIn, type DailyCheckInInput } from './checkins'
import { generateAndPersistIntelligenceForCheckin } from './intelligenceService'

export type CheckInIntelligenceSaveResult = Awaited<ReturnType<typeof generateAndPersistIntelligenceForCheckin>> & {
  checkin: DailyCheckin
}

export async function saveDailyCheckInWithIntelligence(userId: string, input: DailyCheckInInput): Promise<CheckInIntelligenceSaveResult> {
  const checkin = await saveDailyCheckIn(userId, input)
  const intelligence = await generateAndPersistIntelligenceForCheckin(userId, checkin)
  return { checkin, ...intelligence }
}
