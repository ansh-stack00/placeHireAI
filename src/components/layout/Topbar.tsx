'use client'

import { useState } from 'react'
import { Board } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Plus, ChevronDown, LayoutGrid, Check,
  Pencil, Trash2, MoreHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  activeBoard:    Board | null
  boards:         Board[]
  onAddClick:     () => void
  onBoardSwitch:  (board: Board) => void
  onBoardCreated: (board: Board) => void
  onBoardRenamed: (board: Board) => void
  onBoardDeleted: (boardId: string) => void
}

export default function Topbar({
  activeBoard,
  boards,
  onAddClick,
  onBoardSwitch,
  onBoardCreated,
  onBoardRenamed,
  onBoardDeleted,
}: Props) {
  const supabase = createClient()

  const [creating,  setCreating]  = useState(false)
  const [renaming,  setRenaming]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  // ── Create new board ──────────────────────────────────────────────────────
  async function handleNewBoard() {
    const name = window.prompt('Board name:', 'Job Switch 2026')
    if (!name?.trim()) return

    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: board, error } = await supabase
        .from('boards')
        .insert({
          user_id: user.id,
          name:    name.trim(),
          season:  new Date().getFullYear().toString(),
        })
        .select()
        .single()

      if (error) { toast.error('Failed to create board'); return }

      toast.success(`"${name.trim()}" created!`)
      onBoardCreated(board)
      onBoardSwitch(board)
    } finally {
      setCreating(false)
    }
  }

  // ── Rename active board ───────────────────────────────────────────────────
  async function handleRename() {
    if (!activeBoard) return

    const newName = window.prompt('Rename board:', activeBoard.name)
    if (!newName?.trim() || newName.trim() === activeBoard.name) return

    setRenaming(true)
    try {
      const { data: updated, error } = await supabase
        .from('boards')
        .update({ name: newName.trim() })
        .eq('id', activeBoard.id)
        .select()
        .single()

      if (error) { toast.error('Failed to rename board'); return }

      toast.success(`Renamed to "${newName.trim()}"`)
      onBoardRenamed(updated)
    } finally {
      setRenaming(false)
    }
  }

  // ── Delete active board ───────────────────────────────────────────────────
  async function handleDelete() {
    if (!activeBoard) return

    // Prevent deleting the only board
    if (boards.length === 1) {
      toast.error('You must have at least one board')
      return
    }

    const confirmed = window.confirm(
      `Delete "${activeBoard.name}"?\n\nThis will permanently delete all applications in this board. This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', activeBoard.id)

      if (error) { toast.error('Failed to delete board'); return }

      toast.success(`"${activeBoard.name}" deleted`)
      onBoardDeleted(activeBoard.id)
    } finally {
      setDeleting(false)
    }
  }

  const isLoading = creating || renaming || deleting

  return (
    <div className="h-[52px] bg-white border-b border-slate-100 flex items-center justify-between px-5 flex-shrink-0">

      {/* Left — board switcher + actions */}
      <div className="flex items-center gap-2">
        <LayoutGrid size={14} className="text-slate-400 flex-shrink-0" />

        {/* Board name dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-800 hover:text-slate-900 transition-colors cursor-pointer max-w-[200px]">
              <span className="truncate">{activeBoard?.name ?? 'My Applications'}</span>
              <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56">
            {boards.map((board) => (
              <DropdownMenuItem
                key={board.id}
                onClick={() => onBoardSwitch(board)}
                className="flex items-center justify-between text-[13px] cursor-pointer"
              >
                <span className="flex-1 truncate">{board.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {board.season && (
                    <span className="text-[11px] text-slate-400">{board.season}</span>
                  )}
                  {activeBoard?.id === board.id && (
                    <Check size={12} className="text-[#534AB7]" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleNewBoard}
              disabled={creating}
              className="text-[13px] text-[#534AB7] cursor-pointer font-medium"
            >
              <Plus size={13} className="mr-1.5" />
              {creating ? 'Creating...' : 'New board'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeBoard?.season && (
          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
            {activeBoard.season}
          </span>
        )}

        {/* Board actions — rename + delete */}
        {activeBoard && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                disabled={isLoading}
                title="Board actions"
              >
                {isLoading
                  ? <span className="w-3 h-3 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
                  : <MoreHorizontal size={14} />
                }
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onClick={handleRename}
                disabled={renaming}
                className="text-[13px] cursor-pointer"
              >
                <Pencil size={13} className="mr-2 text-slate-400" />
                Rename board
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleting || boards.length === 1}
                className="text-[13px] cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50"
              >
                <Trash2 size={13} className="mr-2" />
                {deleting ? 'Deleting...' : 'Delete board'}
                {boards.length === 1 && (
                  <span className="ml-auto text-[10px] text-slate-400">Only board</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Right — add application */}
      <Button
        onClick={onAddClick}
        size="sm"
        className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl text-[13px] h-8 px-3 cursor-pointer gap-1.5 flex-shrink-0"
      >
        <Plus size={14} />
        Add application
      </Button>
    </div>
  )
}