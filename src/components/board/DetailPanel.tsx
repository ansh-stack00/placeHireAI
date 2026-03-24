'use client'

import { useState, useEffect } from 'react'
import { Application, User, ApplicationStatus } from '@/types'
import {
  X, BrainCircuit, FileText, Info,
  Loader2, ChevronDown, ChevronUp, Check,
  Star, TrendingUp, AlertCircle, Zap,
} from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import { KANBAN_COLUMNS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Pencil } from 'lucide-react'
import EditApplicationModal from './EditApplicationModal'

// Types 
interface PrepQuestion { q: string; hint: string }

interface PrepData {
  dsa:           PrepQuestion[]
  system_design: PrepQuestion[]
  role_specific: PrepQuestion[]
  hr_behavioral: PrepQuestion[]
  company_context?: {
    overview:           string
    interview_style:    string
    things_to_research: string[]
  }
}

interface ScoreResult {
  overall_score:  number
  verdict:        'strong' | 'moderate' | 'weak'
  verdict_reason: string
  dimensions: {
    skills_match:   { score: number; matched: string[]; missing: string[] }
    experience:     { score: number; note: string }
    domain_fit:     { score: number; note: string }
    impact_clarity: { score: number; note: string }
  }
  quick_wins:   string[]
  strengths:    string[]
  resume_label: string
}

interface ResumeOption {
  id:          string
  label:       string
  resume_text?: string | null
}

interface Props {
  application: Application
  profile:     User | null
  onClose:     () => void
  onUpdate:    (app: Application) => void
  onDelete:    (id: string) => void
}

type Tab = 'prep' | 'score' | 'notes' | 'info'

const TAB_LABELS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'prep',  label: 'AI Prep', icon: BrainCircuit },
  { id: 'score', label: 'Score',   icon: Star         },
  { id: 'notes', label: 'Notes',   icon: FileText      },
  { id: 'info',  label: 'Info',    icon: Info          },
]

const PREP_SECTIONS = [
  { key: 'dsa',           label: 'DSA / Coding',    color: '#534AB7' },
  { key: 'system_design', label: 'System design',   color: '#185FA5' },
  { key: 'role_specific', label: 'Role-specific',   color: '#0F6E56' },
  { key: 'hr_behavioral', label: 'HR & Behavioral', color: '#D4537E' },
]

// ─── Score ring 
function ScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const color  = verdict === 'strong' ? '#0F6E56' : verdict === 'moderate' ? '#854F0B' : '#993C1D'
  const bg     = verdict === 'strong' ? '#E1F5EE' : verdict === 'moderate' ? '#FAEEDA' : '#FAECE7'
  const radius = 36
  const circ   = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle
            cx="44" cy="44" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-[10px] text-slate-400">/ 100</span>
        </div>
      </div>
      <span
        className="text-[12px] font-semibold px-3 py-1 rounded-full capitalize"
        style={{ color, background: bg }}
      >
        {verdict} match
      </span>
    </div>
  )
}

// ─── Dimension bar 
function DimensionBar({
  label, score, color,
}: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-slate-500">{label}</span>
        <span className="text-[12px] font-semibold" style={{ color }}>{score}/10</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score * 10}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── Main component 
export default function DetailPanel({
  application,
  profile,
  onClose,
  onUpdate,
  onDelete,
}: Props) {
  const supabase = createClient()

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>('prep')

  // ── AI Prep 
  const [prep,        setPrep]        = useState<PrepData | null>(null)
  const [prepLoading, setPrepLoading] = useState(false)
  const [expanded,    setExpanded]    = useState<Record<string, boolean>>({})

  // ── Score ──
  const [scoreResult,         setScoreResult]         = useState<ScoreResult | null>(null)
  const [scoreLoading,        setScoreLoading]        = useState(false)
  const [scoreResumeId,       setScoreResumeId]       = useState<string | null>(application.resume_id ?? null)
  const [scoreResumes,        setScoreResumes]        = useState<ResumeOption[]>([])
  const [loadingScoreResumes, setLoadingScoreResumes] = useState(false)

  // ── Notes ──
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)

  // ── Info / resume
  const [resumes,        setResumes]        = useState<ResumeOption[]>([])
  const [loadingResumes, setLoadingResumes] = useState(false)
  const [updatingResume, setUpdatingResume] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Fetch resumes for Score tab
  useEffect(() => {
    if (activeTab !== 'score') return
    setLoadingScoreResumes(true)
    supabase
      .from('resumes')
      .select('id, label, resume_text')
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => {
        setScoreResumes(data ?? [])
        setLoadingScoreResumes(false)
      })
  }, [activeTab])

  // Fetch resumes for Info tab
  useEffect(() => {
    if (activeTab !== 'info') return
    setLoadingResumes(true)
    supabase
      .from('resumes')
      .select('id, label')
      .order('uploaded_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setResumes(data ?? [])
        setLoadingResumes(false)
      })
  }, [activeTab])

  // ── Change status ─────────────────────────────────────────────────────────
  async function changeStatus(status: ApplicationStatus) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', application.id)
      .select('*, resume:resumes(id, label)')
      .single()
    if (!error && data) {
      onUpdate(data as Application)
      toast.success(`Moved to ${status.replace(/_/g, ' ')}`)
    } else {
      toast.error('Failed to update status')
    }
  }

  // ── Generate AI prep ──────────────────────────────────────────────────────
  async function generatePrep() {
    setPrepLoading(true)
    try {
      const res  = await fetch('/api/ai/interview-prep', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: application.id,
          company_name:   application.company_name,
          role_title:     application.role_title,
          jd_snapshot:    application.jd_snapshot,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPrep(data)
      toast.success(data.from_cache ? 'Loaded from cache' : 'Interview prep generated!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate prep')
    } finally {
      setPrepLoading(false)
    }
  }

  // ── Score resume ──────────────────────────────────────────────────────────
  async function scoreResume() {
    if (!scoreResumeId) {
      toast.error('Select a resume to score')
      return
    }
    if (!application.jd_snapshot) {
      toast.error('No JD saved — paste the JD when adding the application')
      return
    }

    setScoreLoading(true)
    try {
      const res  = await fetch('/api/ai/score-resume', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: application.id,
          resume_id:      scoreResumeId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScoreResult(data)
      toast.success('Resume scored!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to score resume')
    } finally {
      setScoreLoading(false)
    }
  }

  // ── Save notes 
  async function saveNotes() {
    setSaving(true)
    const { error } = await supabase
      .from('applications')
      .update({ jd_snapshot: notes, updated_at: new Date().toISOString() })
      .eq('id', application.id)
    setSaving(false)
    if (error) toast.error('Failed to save notes')
    else toast.success('Notes saved')
  }

  // ── Update linked resume ──────────────────────────────────────────────────
  async function updateResume(resumeId: string | null) {
    setUpdatingResume(true)
    try {
      const res  = await fetch(`/api/applications/${application.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resume_id: resumeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update resume')
      onUpdate(data.application as Application)
      toast.success(resumeId ? 'Resume linked' : 'Resume removed')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update resume')
    } finally {
      setUpdatingResume(false)
    }
  }

  // ── Delete ─
  async function handleDelete() {
    if (!confirm(`Delete ${application.company_name}? This cannot be undone.`)) return
    setDeleting(true)
    onDelete(application.id)
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // ─── Render 
  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col">

      {/* Header */}
     <div className="flex items-start justify-between p-4 border-b border-slate-100 flex-shrink-0">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-[#EEEDFE] flex items-center justify-center text-[13px] font-bold text-[#534AB7] flex-shrink-0">
      {getInitials(application.company_name)}
    </div>
    <div className="min-w-0">
      <h3 className="font-display font-bold text-slate-900 text-[15px] truncate">
        {application.company_name}
      </h3>
      <p className="text-[12px] text-slate-400 truncate">{application.role_title}</p>
    </div>
  </div>
  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
    {/* Edit button */}
    <button
      onClick={() => setIsEditOpen(true)}
      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-[#534AB7] hover:bg-[#EEEDFE] rounded-lg transition-colors cursor-pointer"
      title="Edit application"
    >
      <Pencil size={13} />
    </button>
    <button
      onClick={onClose}
      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
    >
      <X size={14} />
    </button>
  </div>
</div>

      {/* Stage pills */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {KANBAN_COLUMNS.map((col) => (
            <button
              key={col.id}
              onClick={() => changeStatus(col.id as ApplicationStatus)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer"
              style={
                application.status === col.id
                  ? { background: col.bgColor, color: col.color, borderColor: col.color }
                  : { background: 'transparent', color: '#94a3b8', borderColor: '#e2e8f0' }
              }
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 flex-shrink-0">
        {TAB_LABELS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors cursor-pointer"
            style={
              activeTab === id
                ? { color: '#534AB7', borderBottom: '2px solid #534AB7' }
                : { color: '#94a3b8', borderBottom: '2px solid transparent' }
            }
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── AI Prep ──────────────────────────────────────────────────────── */}
        {activeTab === 'prep' && (
          <div className="p-4">
            {!prep ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#FBEAF0] flex items-center justify-center mx-auto mb-4">
                  <BrainCircuit size={22} className="text-[#D4537E]" />
                </div>
                <p className="text-[14px] font-semibold text-slate-700 mb-1">
                  AI Interview Prep
                </p>
                <p className="text-[12px] text-slate-400 mb-5 max-w-[220px] mx-auto">
                  Get company-specific questions, hints, and context for {application.company_name}.
                </p>
                <Button
                  onClick={generatePrep}
                  disabled={prepLoading}
                  className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl text-[13px] cursor-pointer"
                >
                  {prepLoading
                    ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Generating...</>
                    : <><BrainCircuit size={13} className="mr-1.5" />Generate prep</>
                  }
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">

                {/* Company context */}
                {prep.company_context && (
                  <div className="bg-[#EEEDFE] rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-[#534AB7] uppercase tracking-wide mb-2">
                      Company context
                    </p>
                    <p className="text-[12px] text-[#3C3489] leading-relaxed mb-3">
                      {prep.company_context.overview}
                    </p>
                    {prep.company_context.interview_style && (
                      <p className="text-[12px] text-[#534AB7] leading-relaxed mb-3">
                        <span className="font-semibold">Interview style: </span>
                        {prep.company_context.interview_style}
                      </p>
                    )}
                    {(prep.company_context.things_to_research?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#534AB7] mb-1.5">
                          Research before interview:
                        </p>
                        <ul className="space-y-1">
                          {prep.company_context.things_to_research.map((item, i) => (
                            <li key={i} className="text-[12px] text-[#3C3489] flex gap-1.5">
                              <span>·</span>{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Question sections */}
                {PREP_SECTIONS.map(({ key, label, color }) => {
                  const questions = prep[key as keyof PrepData] as PrepQuestion[] | undefined
                  if (!questions?.length) return null
                  const isOpen = expanded[key] !== false

                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggleExpanded(key)}
                        className="flex items-center justify-between w-full mb-2 cursor-pointer"
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
                          {label}
                          <span className="ml-1.5 text-slate-400 font-normal normal-case">
                            ({questions.length})
                          </span>
                        </span>
                        {isOpen
                          ? <ChevronUp size={13} className="text-slate-400" />
                          : <ChevronDown size={13} className="text-slate-400" />
                        }
                      </button>
                      {isOpen && (
                        <div className="flex flex-col gap-2">
                          {questions.map((q, i) => (
                            <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <p className="text-[12px] font-semibold text-slate-800 mb-1.5">
                                {i + 1}. {q.q}
                              </p>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                💡 {q.hint}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                <button
                  onClick={generatePrep}
                  disabled={prepLoading}
                  className="text-[12px] text-[#534AB7] hover:underline text-center cursor-pointer disabled:opacity-50 pb-2"
                >
                  {prepLoading ? 'Regenerating...' : 'Regenerate prep'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Score ────────────────────────────────────────────────────────── */}
        {activeTab === 'score' && (
          <div className="p-4 flex flex-col gap-4">

            {/* No JD warning */}
            {!application.jd_snapshot && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-700">
                  No JD saved for this application. Paste the job description when adding the application.
                </p>
              </div>
            )}

            {/* Resume picker */}
            {!scoreResult && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                  Select resume to score
                </label>

                {loadingScoreResumes ? (
                  <div className="flex items-center gap-2 text-[12px] text-slate-400">
                    <Loader2 size={11} className="animate-spin" /> Loading...
                  </div>
                ) : scoreResumes.length === 0 ? (
                  <p className="text-[12px] text-slate-400">
                    No resumes uploaded.{' '}
                    <a href="/dashboard/resumes" target="_blank" className="text-[#534AB7] hover:underline">
                      Upload one
                    </a>
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {scoreResumes.map((r) => {
                      const hasText  = !!r.resume_text
                      const selected = scoreResumeId === r.id
                      return (
                        <button
                          key={r.id}
                          onClick={() => hasText && setScoreResumeId(r.id)}
                          disabled={!hasText}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          style={
                            selected
                              ? { background: '#EEEDFE', borderColor: '#AFA9EC' }
                              : { background: 'white', borderColor: '#e2e8f0' }
                          }
                        >
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800">{r.label}</p>
                            {!hasText && (
                              <p className="text-[11px] text-amber-600">
                                No text — go to Resumes page and click Extract text
                              </p>
                            )}
                          </div>
                          {selected && <Check size={14} className="text-[#534AB7]" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Score button */}
            {!scoreResult && (
              <Button
                onClick={scoreResume}
                disabled={!scoreResumeId || scoreLoading || !application.jd_snapshot}
                className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl text-[13px] cursor-pointer w-full"
              >
                {scoreLoading
                  ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Scoring...</>
                  : <><TrendingUp size={13} className="mr-1.5" />Score this resume</>
                }
              </Button>
            )}

            {/* Score results */}
            {scoreResult && (
              <div className="flex flex-col gap-4">

                {/* Ring */}
                <div className="flex flex-col items-center py-4 bg-slate-50 rounded-2xl">
                  <ScoreRing score={scoreResult.overall_score} verdict={scoreResult.verdict} />
                  <p className="text-[12px] text-slate-500 text-center mt-3 max-w-[240px]">
                    {scoreResult.verdict_reason}
                  </p>
                </div>

                {/* Dimension bars */}
                <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col gap-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Breakdown
                  </p>
                  <DimensionBar label="Skills match"   score={scoreResult.dimensions.skills_match.score}   color="#534AB7" />
                  <DimensionBar label="Experience"     score={scoreResult.dimensions.experience.score}     color="#185FA5" />
                  <DimensionBar label="Domain fit"     score={scoreResult.dimensions.domain_fit.score}     color="#0F6E56" />
                  <DimensionBar label="Impact clarity" score={scoreResult.dimensions.impact_clarity.score} color="#D4537E" />
                </div>

                {/* Matched / missing skills */}
                {(scoreResult.dimensions.skills_match.matched.length > 0 ||
                  scoreResult.dimensions.skills_match.missing.length  > 0) && (
                  <div className="flex flex-col gap-2">
                    {scoreResult.dimensions.skills_match.matched.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#0F6E56] uppercase tracking-wide mb-1.5">
                          ✓ Matched skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {scoreResult.dimensions.skills_match.matched.map((s) => (
                            <span key={s} className="text-[11px] bg-[#E1F5EE] text-[#0F6E56] px-2 py-0.5 rounded-full font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {scoreResult.dimensions.skills_match.missing.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#993C1D] uppercase tracking-wide mb-1.5">
                          ✗ Missing skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {scoreResult.dimensions.skills_match.missing.map((s) => (
                            <span key={s} className="text-[11px] bg-[#FAECE7] text-[#993C1D] px-2 py-0.5 rounded-full font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Strengths */}
                {(scoreResult.strengths?.length ?? 0) > 0 && (
                  <div className="bg-[#E1F5EE] rounded-xl p-3">
                    <p className="text-[11px] font-semibold text-[#0F6E56] uppercase tracking-wide mb-2">
                      Strengths
                    </p>
                    <ul className="space-y-1">
                      {scoreResult.strengths.map((s, i) => (
                        <li key={i} className="text-[12px] text-[#0F6E56] flex gap-1.5">
                          <span>·</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick wins */}
                {(scoreResult.quick_wins?.length ?? 0) > 0 && (
                  <div className="bg-[#FAEEDA] rounded-xl p-3">
                    <p className="text-[11px] font-semibold text-[#854F0B] uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Zap size={11} />
                      Quick wins to improve score
                    </p>
                    <ul className="space-y-1.5">
                      {scoreResult.quick_wins.map((win, i) => (
                        <li key={i} className="text-[12px] text-[#854F0B] flex gap-1.5">
                          <span className="flex-shrink-0">{i + 1}.</span>{win}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dimension notes */}
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                  {[
                    { label: 'Experience',     note: scoreResult.dimensions.experience.note     },
                    { label: 'Domain fit',     note: scoreResult.dimensions.domain_fit.note     },
                    { label: 'Impact clarity', note: scoreResult.dimensions.impact_clarity.note },
                  ].map(({ label, note }) => (
                    <div key={label}>
                      <span className="text-[11px] font-semibold text-slate-600">{label}: </span>
                      <span className="text-[11px] text-slate-500">{note}</span>
                    </div>
                  ))}
                </div>

                {/* Re-score */}
                <button
                  onClick={() => setScoreResult(null)}
                  className="text-[12px] text-[#534AB7] hover:underline text-center cursor-pointer pb-2"
                >
                  Score a different resume
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <div className="p-4 flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Interview notes
              </label>
              <textarea
                value={notes || application.jd_snapshot || ''}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this application — what was asked, how it went, follow-up actions..."
                rows={10}
                className="w-full text-[13px] border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
              />
            </div>
            <Button
              onClick={saveNotes}
              disabled={saving}
              className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl text-[13px] cursor-pointer self-start"
            >
              {saving
                ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Saving...</>
                : 'Save notes'
              }
            </Button>
          </div>
        )}

        {/* ── Info  */}
        {activeTab === 'info' && (
          <div className="p-4 flex flex-col gap-4">

            {/* Details */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              {[
                { label: 'Location',    value: application.location                             },
                { label: 'Salary',      value: application.salary_range                         },
                { label: 'Source',      value: application.source                               },
                { label: 'Applied',     value: formatDate(application.applied_at ?? null, true) },
                { label: 'HR contact',  value: application.hr_name                              },
                { label: 'Referral by', value: application.referral_by                          },
              ]
                .filter((row) => row.value)
                .map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="text-[12px] text-slate-400 flex-shrink-0">{label}</span>
                    <span className="text-[12px] font-medium text-slate-700 text-right">{value}</span>
                  </div>
                ))}
            </div>

            {/* Resume selector */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                Resume used
                {updatingResume && (
                  <span className="flex items-center gap-1 text-slate-400 font-normal normal-case">
                    <Loader2 size={10} className="animate-spin" /> Saving...
                  </span>
                )}
              </p>

              {loadingResumes ? (
                <div className="flex items-center gap-2 text-[12px] text-slate-400">
                  <Loader2 size={11} className="animate-spin" /> Loading...
                </div>
              ) : resumes.length === 0 ? (
                <div className="flex items-center gap-2 text-[12px] text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <FileText size={13} className="flex-shrink-0" />
                  No resumes —{' '}
                  <a href="/dashboard/resumes" target="_blank" className="text-[#534AB7] hover:underline font-medium">
                    upload one
                  </a>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => updateResume(null)}
                    disabled={updatingResume}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer disabled:opacity-50"
                    style={
                      !application.resume_id
                        ? { background: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' }
                        : { background: 'transparent', color: '#94a3b8', borderColor: '#e2e8f0' }
                    }
                  >
                    {!application.resume_id && <Check size={10} />}
                    None
                  </button>

                  {resumes.map((r) => {
                    const isSelected = application.resume_id === r.id
                    return (
                      <button
                        key={r.id}
                        onClick={() => updateResume(r.id)}
                        disabled={updatingResume}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer disabled:opacity-50"
                        style={
                          isSelected
                            ? { background: '#EEEDFE', color: '#534AB7', borderColor: '#AFA9EC' }
                            : { background: 'transparent', color: '#94a3b8', borderColor: '#e2e8f0' }
                        }
                      >
                        {isSelected && <Check size={10} />}
                        {r.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Skills */}
            {(application.must_have_skills?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Required skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {application.must_have_skills!.map((skill) => (
                    <span key={skill} className="text-[11px] bg-[#EEEDFE] text-[#534AB7] px-2 py-0.5 rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tech stack */}
            {(application.tech_stack?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Tech stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {application.tech_stack!.map((tech) => (
                    <span key={tech} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Delete */}
            <div className="pt-2 border-t border-slate-100">
              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="outline"
                size="sm"
                className="w-full border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-[12px] cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete application'}
              </Button>
            </div>
          </div>
        )}
      </div>
      {isEditOpen && (
  <EditApplicationModal
    application={application}
    userId={profile?.id ?? ''}
    onClose={() => setIsEditOpen(false)}
    onUpdated={(updated) => {
      onUpdate(updated)
      setIsEditOpen(false)
    }}
  />
)}
    </div>
  )
}