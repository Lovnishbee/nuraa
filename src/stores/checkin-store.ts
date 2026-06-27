import { create } from 'zustand'

type CheckInStore = {
  lastSavedAt: string | null
  draftNotes: string
  setDraftNotes: (notes: string) => void
  markSaved: () => void
}

export const useCheckInStore = create<CheckInStore>((set) => ({
  lastSavedAt: null,
  draftNotes: '',
  setDraftNotes: (draftNotes) => set({ draftNotes }),
  markSaved: () => set({ lastSavedAt: new Date().toISOString(), draftNotes: '' }),
}))
