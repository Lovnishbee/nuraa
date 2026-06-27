import { create } from 'zustand'

type ProfileStore = {
  editingSection: string | null
  setEditingSection: (section: string | null) => void
}

export const useProfileStore = create<ProfileStore>((set) => ({
  editingSection: null,
  setEditingSection: (editingSection) => set({ editingSection }),
}))
