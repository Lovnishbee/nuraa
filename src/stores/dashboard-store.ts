import { create } from 'zustand'

type DashboardStore = {
  selectedRange: 'today' | 'week'
  setSelectedRange: (range: DashboardStore['selectedRange']) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  selectedRange: 'today',
  setSelectedRange: (selectedRange) => set({ selectedRange }),
}))
