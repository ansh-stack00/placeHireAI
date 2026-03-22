import { create } from 'zustand'
import { Application } from '@/types'

interface UIStore {
  // Detail panel
  selectedApplication: Application | null
  setSelectedApplication: (app: Application | null) => void

  // Add application modal
  isAddModalOpen: boolean
  openAddModal: () => void
  closeAddModal: () => void

  // Active detail panel tab
  detailTab: 'ai_prep' | 'notes' | 'info'
  setDetailTab: (tab: 'ai_prep' | 'notes' | 'info') => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedApplication: null,
  setSelectedApplication: (app) => set({ selectedApplication: app }),

  isAddModalOpen: false,
  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),

  detailTab: 'ai_prep',
  setDetailTab: (tab) => set({ detailTab: tab }),
}))