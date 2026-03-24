'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Upload, FileText, Trash2, Loader2,
  AlertCircle, RefreshCw, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Resume {
  id:                 string
  label:              string
  file_url:           string | null
  resume_text:        string | null
  uploaded_at:        string
  total_applications: number
  callback_rate:      number | null
}

interface Props {
  profile: User | null
}

const BUCKET = 'resume'

export default function ResumesClient({ profile }: Props) {
  const [resumes,   setResumes]   = useState<Resume[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [label,     setLabel]     = useState('')
  const [file,      setFile]      = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Track which resume is currently being viewed or re-extracted
  const [viewing,     setViewing]     = useState<string | null>(null)
  const [extracting,  setExtracting]  = useState<string | null>(null)

  useEffect(() => { fetchResumes() }, [])

  async function fetchResumes() {
    setLoading(true)
    try {
      const res  = await fetch('/api/resumes')
      const data = await res.json()
      setResumes(data.resumes ?? [])
    } catch {
      toast.error('Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }

  
  async function handleUpload() {
    if (!file)          { toast.error('Select a PDF file'); return }
    if (!label.trim())  { toast.error('Add a label for this resume'); return }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file',   file)
      form.append('label',  label.trim())
      form.append('bucket', BUCKET)

      const res  = await fetch('/api/resumes/upload', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) { toast.error(data.error ?? 'Upload failed'); return }

      toast.success('Resume uploaded!')
      setLabel('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      fetchResumes()
    } catch {
      toast.error('Upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  // View (signed URL) 
  async function handleView(resumeId: string, filePath: string | null) {
    if (!filePath) { toast.error('No file attached to this resume'); return }
    setViewing(resumeId)
    try {
      const res  = await fetch(
        `/api/resumes/signed-url?path=${encodeURIComponent(filePath)}&bucket=${BUCKET}`
      )
      const data = await res.json()
      if (!res.ok || !data.url) { toast.error(data.error ?? 'Could not open file'); return }
      window.open(data.url, '_blank')
    } catch {
      toast.error('Failed to open file')
    } finally {
      setViewing(null)
    }
  }

  // Re-extract text 
  async function handleReExtract(resumeId: string, label: string) {
    setExtracting(resumeId)
    try {
      const res  = await fetch('/api/resumes/re-extract', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resume_id: resumeId }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to extract text')
        return
      }

      toast.success(`Text extracted from "${label}" — ready for AI scoring`)

      // Update local state so the warning disappears immediately
      setResumes((prev) =>
        prev.map((r) =>
          r.id === resumeId
            ? { ...r, resume_text: 'extracted' } // non-null triggers UI update
            : r
        )
      )
    } catch {
      toast.error('Failed to extract text')
    } finally {
      setExtracting(null)
    }
  }

  // Delete 
  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/resumes', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      })
      if (res.ok) {
        toast.success('Resume deleted')
        setResumes((prev) => prev.filter((r) => r.id !== id))
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  function getRateBadge(rate: number | null) {
    if (rate === null) return { label: 'No data yet',      color: '#94a3b8', bg: '#f1f5f9' }
    if (rate >= 50)    return { label: `${rate}% callback`, color: '#0F6E56', bg: '#E1F5EE' }
    if (rate >= 25)    return { label: `${rate}% callback`, color: '#854F0B', bg: '#FAEEDA' }
    return               { label: `${rate}% callback`, color: '#993C1D', bg: '#FAECE7' }
  }

  const isPro     = profile?.plan === 'pro'
  const canUpload = isPro || resumes.length < 2

  // Count resumes missing text
  const missingText = resumes.filter((r) => !r.resume_text).length

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">
          Resume manager
        </h1>
        <p className="text-[14px] text-slate-400">
          Upload resume versions and track which one gets the most callbacks.
        </p>
      </div>

      {/* Banner: resumes missing text */}
      {missingText > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800 mb-0.5">
              {missingText} resume{missingText > 1 ? 's need' : ' needs'} text extraction
            </p>
            <p className="text-[12px] text-amber-700">
              AI scoring requires extracted text. Click <strong>Extract text</strong> on each resume below.
            </p>
          </div>
        </div>
      )}

      {/* Upload card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="font-display font-semibold text-slate-800 text-[15px] mb-4">
          Upload new resume
        </h2>

        {!canUpload && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
            <p className="text-[13px] text-amber-700">
              Free plan allows 2 resumes. Upgrade to Pro for unlimited.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Label
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. SDE Resume v3, FAANG version, Startup version"
              disabled={!canUpload}
              className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              PDF file (max 5MB)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              disabled={!canUpload}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none file:mr-3 file:border-0 file:bg-[#EEEDFE] file:text-[#534AB7] file:rounded-lg file:px-3 file:py-1 file:text-[12px] file:font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {file && (
              <p className="text-[11px] text-slate-400 mt-1">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!canUpload || uploading || !file || !label.trim()}
            className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl text-[13px] cursor-pointer self-start"
          >
            {uploading
              ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Uploading...</>
              : <><Upload size={13} className="mr-1.5" />Upload resume</>
            }
          </Button>
        </div>
      </div>

      {/* Resume list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-slate-800 text-[15px]">
            Your resumes
          </h2>
          {!isPro && (
            <span className="text-[12px] text-slate-400">{resumes.length} / 2 used</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
            <FileText size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-[14px] font-medium text-slate-500">No resumes yet</p>
            <p className="text-[13px] text-slate-400 mt-1">Upload your first resume above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {resumes.map((resume) => {
              const badge        = getRateBadge(resume.callback_rate)
              const isViewing    = viewing    === resume.id
              const isExtracting = extracting === resume.id
              const hasText      = !!resume.resume_text

              return (
                <div
                  key={resume.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-[#534AB7]" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-[14px] truncate">
                          {resume.label}
                        </p>
                        {/* AI ready indicator */}
                        {hasText ? (
                          <span className="flex items-center gap-1 text-[10px] text-[#0F6E56] bg-[#E1F5EE] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                            <CheckCircle2 size={9} />
                            AI ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                            <AlertCircle size={9} />
                            No text
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-400 mt-0.5">
                        {resume.total_applications} application{resume.total_applications !== 1 ? 's' : ''}
                        {' · '}
                        {new Date(resume.uploaded_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full hidden sm:block"
                        style={{ color: badge.color, background: badge.bg }}
                      >
                        {badge.label}
                      </span>

                      {resume.file_url && (
                        <button
                          onClick={() => handleView(resume.id, resume.file_url)}
                          disabled={isViewing}
                          className="text-[12px] text-[#534AB7] hover:underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          {isViewing && <Loader2 size={11} className="animate-spin" />}
                          View
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(resume.id, resume.label)}
                        className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete resume"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Extract text row — only shown when resume_text is null */}
                  {!hasText && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <p className="text-[12px] text-slate-400">
                        Text not extracted — required for AI resume scoring.
                      </p>
                      <button
                        onClick={() => handleReExtract(resume.id, resume.label)}
                        disabled={isExtracting}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-[#534AB7] hover:text-[#3C3489] transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
                      >
                        {isExtracting
                          ? <><Loader2 size={12} className="animate-spin" />Extracting...</>
                          : <><RefreshCw size={12} />Extract text</>
                        }
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}