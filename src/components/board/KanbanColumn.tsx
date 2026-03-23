'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Application, ApplicationStatus } from '@/types'
import { KanbanColumn as KanbanColumnType } from '@/types'
import ApplicationCard from './ApplicationCard'
import { cn } from '@/lib/utils'

interface Props {
  column: KanbanColumnType
  applications: Application[]
  onCardClick: (app: Application) => void
  selectedId: string | null
}

export default function KanbanColumn({
  column,
  applications,
  onCardClick,
  selectedId,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex flex-col w-[220px] min-w-[220px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-[12px] font-semibold text-slate-600">{column.label}</span>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: column.bgColor, color: column.color }}
        >
          {applications.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 flex-1 min-h-[200px] rounded-xl p-2 transition-colors duration-150',
          isOver
            ? 'bg-slate-100 ring-2 ring-inset ring-slate-200'
            : 'bg-slate-50'
        )}
      >
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onClick={() => onCardClick(app)}
              isSelected={selectedId === app.id}
              isDragging={false}
            />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-slate-300">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}