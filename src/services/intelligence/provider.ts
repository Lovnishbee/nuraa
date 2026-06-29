import type { DailyCheckin } from '@/types/database'
import { saveDailyCheckIn, type DailyCheckInInput } from '../checkins'
import { backfillMissingIntelligenceForUser, generateAndPersistIntelligenceForCheckin } from '../intelligenceService'

export type CheckInIntelligenceSaveResult = Awaited<ReturnType<typeof generateAndPersistIntelligenceForCheckin>> & {
  checkin: DailyCheckin
}

// Phase 3 intelligence is deterministic so the app can produce reliable guidance
// without OpenAI, Edge Functions, or service-role writes in the browser.
export interface IntelligenceProvider {
  generate(userId: string, input: DailyCheckInInput): Promise<CheckInIntelligenceSaveResult>
  backfill(userId: string): Promise<Awaited<ReturnType<typeof backfillMissingIntelligenceForUser>>>
}

// This provider boundary is intentionally small so Phase 4 can swap the local
// deterministic implementation for Supabase Edge Functions without UI changes.
export class LocalIntelligenceProvider implements IntelligenceProvider {
  async generate(userId: string, input: DailyCheckInInput): Promise<CheckInIntelligenceSaveResult> {
    const checkin = await saveDailyCheckIn(userId, input)
    const intelligence = await generateAndPersistIntelligenceForCheckin(userId, checkin)
    return { checkin, ...intelligence }
  }

  backfill(userId: string) {
    return backfillMissingIntelligenceForUser(userId)
  }
}

export const localIntelligenceProvider = new LocalIntelligenceProvider()
