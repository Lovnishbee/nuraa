import { create } from 'zustand'

type SettingsStore = {
  mobileMenuOpen: boolean
  drawerOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  setDrawerOpen: (open: boolean) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  mobileMenuOpen: false,
  drawerOpen: false,
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}))
