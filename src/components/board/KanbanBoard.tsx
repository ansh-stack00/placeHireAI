'use client'

import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { KANBAN_COLUMNS } from '@/lib/constants'
import { Application, ApplicationStatus, Board, User } from '@/types'
import KanbanColumn from './KanbanColumn'
import ApplicationCard from './ApplicationCard'
import DetailPanel from './DetailPanel'
import AddApplicationModal from './AddApplicationModal'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  initialApplications: Application[]
  boards:              Board[]
  activeBoard:         Board | null
  profile:             User | null
}

export default function KanbanBoard({
  initialApplications,
  boards:       initialBoards,
  activeBoard:  initialActiveBoard,
  profile,
}: Props) {
  const supabase = createClient()

  // ── Board state ────────────────────────────────────────────────────────────
  const [boards,      setBoards]      = useState<Board[]>(initialBoards)
  const [activeBoard, setActiveBoard] = useState<Board | null>(initialActiveBoard)

  // ── Application state ──────────────────────────────────────────────────────
  const [applications, setApplications] = useState<Application[]>(initialApplications)
  const [loadingApps,  setLoadingApps]  = useState(false)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedApp,    setSelectedApp]    = useState<Application | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [activeId,       setActiveId]       = useState<string | null>(null)

  const dragOriginalStatus = useRef<ApplicationStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const getColumnApps = useCallback(
    (status: ApplicationStatus) => applications.filter((a) => a.status === status),
    [applications]
  )

  const activeApp = applications.find((a) => a.id === activeId) ?? null

  // ── Board switch ───────────────────────────────────────────────────────────
  async function handleBoardSwitch(board: Board) {
    if (board.id === activeBoard?.id) return
    setActiveBoard(board)
    setSelectedApp(null)
    setApplications([])
    setLoadingApps(true)

    const { data, error } = await supabase
      .from('applications')
      .select('*, resume:resumes(id, label)')
      .eq('board_id', board.id)
      .order('position', { ascending: true })

    setLoadingApps(false)
    if (error) { toast.error('Failed to load applications'); return }
    setApplications(data ?? [])
  }

  // ── Board created ──────────────────────────────────────────────────────────
  function handleBoardCreated(board: Board) {
    setBoards((prev) => [...prev, board])
  }

  // ── Board renamed ──────────────────────────────────────────────────────────
  function handleBoardRenamed(updated: Board) {
    setBoards((prev) => prev.map((b) => b.id === updated.id ? updated : b))
    if (activeBoard?.id === updated.id) setActiveBoard(updated)
  }

  // ── Board deleted ──────────────────────────────────────────────────────────
  function handleBoardDeleted(boardId: string) {
    const remaining = boards.filter((b) => b.id !== boardId)
    setBoards(remaining)

    // Switch to first remaining board
    if (remaining.length > 0) {
      handleBoardSwitch(remaining[0])
    } else {
      // Should never happen (we prevent deleting last board in Topbar)
      setActiveBoard(null)
      setApplications([])
    }
  }

  // ── Drag start ─────────────────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const id  = event.active.id as string
    const app = applications.find((a) => a.id === id)
    setActiveId(id)
    dragOriginalStatus.current = app?.status ?? null
  }

  // ── Drag over — optimistic UI ──────────────────────────────────────────────
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const dragged    = applications.find((a) => a.id === active.id)
    if (!dragged) return

    const overId     = over.id as string
    const overColumn = KANBAN_COLUMNS.find((c) => c.id === overId)
    const overApp    = applications.find((a) => a.id === overId)
    const newStatus  = (overColumn?.id ?? overApp?.status ?? dragged.status) as ApplicationStatus

    if (newStatus !== dragged.status) {
      setApplications((prev) =>
        prev.map((a) => a.id === dragged.id ? { ...a, status: newStatus } : a)
      )
    }
  }

  // ── Drag end — persist ─────────────────────────────────────────────────────
  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    const id             = active.id as string
    const originalStatus = dragOriginalStatus.current
    dragOriginalStatus.current = null

    if (!over || !originalStatus) return

    const currentApp = applications.find((a) => a.id === id)
    if (!currentApp) return

    const finalStatus = currentApp.status
    if (finalStatus === originalStatus) return

    const { error } = await supabase
      .from('applications')
      .update({ status: finalStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
      setApplications((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: originalStatus } : a)
      )
    } else {
      toast.success(`Moved to ${finalStatus.replace(/_/g, ' ')}`)
    }
  }

  // ── Application CRUD ───────────────────────────────────────────────────────
  function handleApplicationAdded(newApp: Application) {
    setApplications((prev) => [...prev, newApp])
    setIsAddModalOpen(false)
    toast.success(`${newApp.company_name} added!`)
  }

  function handleApplicationUpdated(updated: Application) {
    setApplications((prev) => prev.map((a) => a.id === updated.id ? updated : a))
    setSelectedApp(updated)
  }

  async function handleApplicationDeleted(id: string) {
    setApplications((prev) => prev.filter((a) => a.id !== id))
    setSelectedApp(null)
    const { error } = await supabase.from('applications').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else toast.success('Application deleted')
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalApps    = applications.length
  const inProgress   = applications.filter((a) => !['wishlist','rejected','ghosted','offer'].includes(a.status)).length
  const offers       = applications.filter((a) => a.status === 'offer').length
  const nonWishlist  = applications.filter((a) => a.status !== 'wishlist').length
  const responded    = applications.filter((a) => !['wishlist','applied'].includes(a.status)).length
  const responseRate = nonWishlist > 0 ? Math.round((responded / nonWishlist) * 100) + '%' : '—'

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <Topbar
        activeBoard={activeBoard}
        boards={boards}
        onAddClick={() => setIsAddModalOpen(true)}
        onBoardSwitch={onBoardSwitch => handleBoardSwitch(onBoardSwitch)}
        onBoardCreated={handleBoardCreated}
        onBoardRenamed={handleBoardRenamed}
        onBoardDeleted={handleBoardDeleted}
      />

      {/* Stats row */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-100 bg-white flex-shrink-0 overflow-x-auto">
        {[
          { label: 'Total',         value: totalApps,    color: '#534AB7' },
          { label: 'In progress',   value: inProgress,   color: '#185FA5' },
          { label: 'Offers',        value: offers,       color: '#0F6E56' },
          { label: 'Response rate', value: responseRate, color: '#854F0B' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex-shrink-0"
          >
            <span className="text-[11px] text-slate-400">{label}</span>
            <span className="text-[13px] font-semibold" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Board area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {loadingApps ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-slate-400">Loading {activeBoard?.name}...</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 p-4 h-full min-w-max">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  applications={getColumnApps(column.id as ApplicationStatus)}
                  onCardClick={setSelectedApp}
                  selectedId={selectedApp?.id ?? null}
                />
              ))}

              <DragOverlay>
                {activeApp ? (
                  <ApplicationCard
                    application={activeApp}
                    onClick={() => {}}
                    isSelected={false}
                    isDragging
                  />
                ) : null}
              </DragOverlay>
            </DndContext>

            {totalApps === 0 && !loadingApps && (
              <div className="flex flex-col items-center justify-center flex-1 min-w-[300px]">
                <div className="w-16 h-16 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mb-4">
                  <Plus size={28} className="text-[#534AB7]" />
                </div>
                <h3 className="font-display font-semibold text-slate-800 text-lg mb-2">
                  No applications yet
                </h3>
                <p className="text-slate-400 text-[13px] mb-6 text-center max-w-xs">
                  {activeBoard
                    ? `Add your first application to ${activeBoard.name}`
                    : 'Add your first application to get started'
                  }
                </p>
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl px-6 cursor-pointer"
                >
                  Add first application
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedApp && (
        <DetailPanel
          application={selectedApp}
          profile={profile}
          onClose={() => setSelectedApp(null)}
          onUpdate={handleApplicationUpdated}
          onDelete={handleApplicationDeleted}
        />
      )}

      {isAddModalOpen && activeBoard && (
        <AddApplicationModal
          boardId={activeBoard.id}
          userId={profile?.id ?? ''}
          onClose={() => setIsAddModalOpen(false)}
          onAdded={handleApplicationAdded}
        />
      )}
    </div>
  )
}