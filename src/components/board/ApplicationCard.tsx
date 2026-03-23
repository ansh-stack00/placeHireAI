'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Application } from '@/types'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { GripVertical } from 'lucide-react'

// ─── Company Logo ─────────────────────────────────────────────────────────────
// Uses Google's favicon service as a reliable source for company logos.
// Falls back to initials if the image fails to load.
function CompanyLogo({ name }: { name: string }) {
  const [imgFailed, setImgFailed] = useState(false)

  // Build a best-guess domain from the company name
  const domain = name
    .toLowerCase()
    .replace(/\s+(inc|ltd|llc|pvt|corp|technologies|technology|solutions|services)\.?$/i, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    + '.com'

  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`

  if (imgFailed) {
    return (
      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 flex-shrink-0">
        {getInitials(name)}
      </div>
    )
  }

  return (
    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
      <img
        src={logoUrl}
        alt=""
        width={16}
        height={16}
        onError={() => setImgFailed(true)}
        className="w-4 h-4 object-contain"
      />
    </div>
  )
}

// ─── Application Card ─────────────────────────────────────────────────────────
interface Props {
  application: Application
  onClick:     () => void
  isSelected:  boolean
  isDragging?: boolean
}

export default function ApplicationCard({
  application,
  onClick,
  isSelected,
  isDragging = false,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: application.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'group bg-white rounded-xl border p-3 cursor-pointer transition-all duration-150 select-none',
        isSelected
          ? 'border-[#534AB7] ring-1 ring-[#534AB7]/20 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
        (isSortableDragging || isDragging) && 'opacity-50 shadow-lg rotate-1 scale-105'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={13} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Company name + logo */}
          <div className="flex items-center gap-2 mb-1.5">
            <CompanyLogo name={application.company_name} />
            <p className="text-[13px] font-semibold text-slate-800 truncate">
              {application.company_name}
            </p>
          </div>

          {/* Role */}
          <p className="text-[11px] text-slate-500 truncate mb-2">
            {application.role_title}
          </p>

          {/* Footer: resume tag + date */}
          <div className="flex items-center justify-between gap-1">
            {application.resume?.label ? (
              <span className="text-[10px] bg-[#EEEDFE] text-[#534AB7] px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]">
                {application.resume.label}
              </span>
            ) : (
              <span className="text-[10px] text-slate-300">No resume</span>
            )}
            <span className="text-[10px] text-slate-300 flex-shrink-0">
              {formatDate(application.applied_at ?? application.updated_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}