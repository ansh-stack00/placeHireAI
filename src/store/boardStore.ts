import { create } from 'zustand'
import { Board, Application, ApplicationStatus } from '@/types'

interface BoardStore {
  // Boards
  boards: Board[]
  activeBoard: Board | null
  setBoards: (boards: Board[]) => void
  setActiveBoard: (board: Board) => void

  // Applications
  applications: Application[]
  setApplications: (apps: Application[]) => void

  // Optimistic updates
  updateApplicationStatus: (id: string, status: ApplicationStatus) => void
  addApplication: (app: Application) => void
  removeApplication: (id: string) => void
}

export const useBoardStore = create<BoardStore>((set) => ({
  boards: [],
  activeBoard: null,
  setBoards: (boards) => set({ boards }),
  setActiveBoard: (board) => set({ activeBoard: board }),

  applications: [],
  setApplications: (applications) => set({ applications }),

  updateApplicationStatus: (id, status) =>
    set((state) => ({
      applications: state.applications.map((app) =>
        app.id === id ? { ...app, status } : app
      ),
    })),

  addApplication: (app) =>
    set((state) => ({ applications: [...state.applications, app] })),

  removeApplication: (id) =>
    set((state) => ({
      applications: state.applications.filter((app) => app.id !== id),
    })),
}))