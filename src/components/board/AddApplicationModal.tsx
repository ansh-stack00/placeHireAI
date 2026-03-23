'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Application } from '@/types'
import { Button } from '@/components/ui/button'
import { X, Loader2, Sparkles, FileText, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  boardId: string
  userId:  string
  onClose: () => void
  onAdded: (app: Application) => void
}

interface Resume { id: string; label: string }

const SOURCES  = ['LinkedIn', 'Company website', 'Referral', 'Campus portal', 'Naukri', 'Internshala', 'Other']
const STATUSES = [
  { value: 'wishlist',  label: 'Wishlist'  },
  { value: 'applied',   label: 'Applied'   },
  { value: 'oa_test',   label: 'OA / Test' },
]

// ── Tag input component ────────────────────────────────────────────────────────
// Type a skill/tech and press Enter or comma to add it as a tag pill
function TagInput({
  tags,
  onChange,
  placeholder,
  color = '#534AB7',
  bg    = '#EEEDFE',
}: {
  tags:        string[]
  onChange:    (tags: string[]) => void
  placeholder: string
  color?:      string
  bg?:         string
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(value: string) {
    const trimmed = value.trim().replace(/,/g, '')
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="min-h-[42px] w-full border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#534AB7]/20 focus-within:border-[#534AB7] transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: bg, color }}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
            className="hover:opacity-60 transition-opacity cursor-pointer leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-[13px] outline-none bg-transparent placeholder:text-slate-300"
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AddApplicationModal({ boardId, userId, onClose, onAdded }: Props) {
  const supabase = createClient()

  const [form, setForm] = useState({
    company_name: '',
    role_title:   '',
    location:     '',
    salary_range: '',
    source:       'LinkedIn',
    status:       'applied',
    jd_snapshot:  '',
    applied_at:   new Date().toISOString().split('T')[0],
  })

  // Skill / tech tags — editable manually OR auto-filled by JD parser
  const [techStack,      setTechStack]      = useState<string[]>([])
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>([])

  // Resume
  const [resumes,          setResumes]          = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [loadingResumes,   setLoadingResumes]   = useState(false)

  // JD parser UI
  const [jdText,  setJdText]  = useState('')
  const [parsing, setParsing] = useState(false)
  const [showJD,  setShowJD]  = useState(true)
  const [parsed,  setParsed]  = useState(false)

  // Save
  const [saving, setSaving] = useState(false)

  // Fetch resumes on mount
  useEffect(() => {
    if (!userId) return
    setLoadingResumes(true)
    supabase
      .from('resumes')
      .select('id, label')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setResumes(data)
        setLoadingResumes(false)
      })
  }, [userId])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ── JD Auto-parser ──────────────────────────────────────────────────────────
  async function parseJD() {
    if (!jdText.trim()) { toast.error('Paste a job description first'); return }
    if (jdText.trim().length < 50) { toast.error('JD is too short — paste the full job description'); return }

    setParsing(true)
    try {
      const res  = await fetch('/api/ai/parse-jd', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jd_text: jdText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')

      // Fill form fields
      setForm((prev) => ({
        ...prev,
        company_name: data.company_name || prev.company_name,
        role_title:   data.role_title   || prev.role_title,
        location:     data.location     || prev.location,
        salary_range: data.salary_range || prev.salary_range,
        jd_snapshot:  jdText,
      }))

      // Fill tag fields — merge with anything already typed
      if (Array.isArray(data.tech_stack) && data.tech_stack.length > 0) {
        setTechStack((prev) => [...new Set([...prev, ...data.tech_stack])])
      }
      if (Array.isArray(data.must_have_skills) && data.must_have_skills.length > 0) {
        setMustHaveSkills((prev) => [...new Set([...prev, ...data.must_have_skills])])
      }

      setParsed(true)
      setShowJD(false)
      toast.success('JD parsed — review and save')

    } catch (err: any) {
      toast.error(err.message ?? 'Failed to parse JD')
    } finally {
      setParsing(false)
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return }
    if (!form.role_title.trim())   { toast.error('Role title is required');   return }
    if (!boardId)                  { toast.error('No board found — please refresh'); return }

    setSaving(true)
    try {
      const { data: lastApp } = await supabase
        .from('applications')
        .select('position')
        .eq('board_id', boardId)
        .eq('status', form.status)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data, error } = await supabase
        .from('applications')
        .insert({
          board_id:         boardId,
          resume_id:        selectedResumeId ?? null,
          company_name:     form.company_name.trim(),
          role_title:       form.role_title.trim(),
          location:         form.location     || null,
          salary_range:     form.salary_range || null,
          source:           form.source       || null,
          status:           form.status,
          jd_snapshot:      form.jd_snapshot  || null,
          tech_stack:       techStack.length      > 0 ? techStack      : null,
          must_have_skills: mustHaveSkills.length > 0 ? mustHaveSkills : null,
          applied_at:       form.applied_at
                              ? new Date(form.applied_at).toISOString()
                              : new Date().toISOString(),
          position:         (lastApp?.position ?? -1) + 1,
        })
        .select('*, resume:resumes(id, label)')
        .single()

      if (error) throw new Error(error.message)
      onAdded(data as Application)

    } catch (err: any) {
      console.error('[AddApplicationModal] save error:', err)
      toast.error(err.message ?? 'Failed to save application')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-display font-bold text-slate-900 text-[16px]">Add application</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* ── JD Parser ────────────────────────────────────────────────── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowJD(!showJD)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#534AB7]" />
                <span className="text-[13px] font-semibold text-slate-700">
                  Parse job description with AI
                </span>
                {parsed && (
                  <span className="text-[10px] bg-[#E1F5EE] text-[#0F6E56] px-2 py-0.5 rounded-full font-medium">
                    Parsed ✓
                  </span>
                )}
              </div>
              {showJD
                ? <ChevronUp size={14} className="text-slate-400" />
                : <ChevronDown size={14} className="text-slate-400" />
              }
            </button>

            {showJD && (
              <div className="p-4 flex flex-col gap-3">
                <p className="text-[11px] text-slate-400">
                  Paste the full JD — AI will auto-fill all fields below including skills and tech stack.
                </p>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste job description here..."
                  rows={5}
                  className="w-full text-[13px] border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                />
                <Button
                  onClick={parseJD}
                  disabled={!jdText.trim() || parsing}
                  size="sm"
                  className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl text-[12px] h-8 px-4 cursor-pointer self-start"
                >
                  {parsing
                    ? <><Loader2 size={12} className="mr-1.5 animate-spin" />Parsing...</>
                    : <><Sparkles size={12} className="mr-1.5" />Parse with AI</>
                  }
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* ── Company + Role ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Company <span className="text-red-400">*</span>
              </label>
              <input
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
                placeholder="e.g. Google"
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Role <span className="text-red-400">*</span>
              </label>
              <input
                value={form.role_title}
                onChange={(e) => set('role_title', e.target.value)}
                placeholder="e.g. SDE-1"
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
              />
            </div>
          </div>

          {/* ── Location + Salary ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Location</label>
              <input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Bengaluru"
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Salary range</label>
              <input
                value={form.salary_range}
                onChange={(e) => set('salary_range', e.target.value)}
                placeholder="e.g. ₹20–26L"
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
              />
            </div>
          </div>

          {/* ── Source + Status ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Applied via</label>
              <select
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors bg-white"
              >
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Initial status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors bg-white"
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Must-have skills ──────────────────────────────────────────── */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Must-have skills
            </label>
            <p className="text-[11px] text-slate-400 mb-1.5">
              Type a skill and press <kbd className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">Enter</kbd> or <kbd className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">,</kbd> to add
            </p>
            <TagInput
              tags={mustHaveSkills}
              onChange={setMustHaveSkills}
              placeholder="e.g. React, Node.js, System Design..."
              color="#534AB7"
              bg="#EEEDFE"
            />
          </div>

          {/* ── Tech stack ────────────────────────────────────────────────── */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Tech stack
            </label>
            <p className="text-[11px] text-slate-400 mb-1.5">
              Technologies mentioned in the JD
            </p>
            <TagInput
              tags={techStack}
              onChange={setTechStack}
              placeholder="e.g. AWS, PostgreSQL, Docker..."
              color="#185FA5"
              bg="#E6F1FB"
            />
          </div>

          {/* ── Resume selector ───────────────────────────────────────────── */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Resume version
            </label>
            {loadingResumes ? (
              <div className="flex items-center gap-2 text-[12px] text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Loading resumes...
              </div>
            ) : resumes.length === 0 ? (
              <div className="flex items-center gap-2 text-[12px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
                <FileText size={13} />
                No resumes yet —{' '}
                <a href="/dashboard/resumes" target="_blank" className="text-[#534AB7] hover:underline font-medium">
                  upload one
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedResumeId(null)}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border transition-all cursor-pointer"
                  style={
                    selectedResumeId === null
                      ? { background: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' }
                      : { background: 'transparent', color: '#94a3b8', borderColor: '#e2e8f0' }
                  }
                >
                  None
                </button>
                {resumes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedResumeId(r.id)}
                    className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border transition-all cursor-pointer"
                    style={
                      selectedResumeId === r.id
                        ? { background: '#EEEDFE', color: '#534AB7', borderColor: '#AFA9EC' }
                        : { background: 'transparent', color: '#94a3b8', borderColor: '#e2e8f0' }
                    }
                  >
                    {selectedResumeId === r.id && <Check size={11} />}
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Date applied ──────────────────────────────────────────────── */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Date applied
            </label>
            <input
              type="date"
              value={form.applied_at}
              onChange={(e) => set('applied_at', e.target.value)}
              className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-slate-200 text-slate-600 text-[13px] cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl text-[13px] cursor-pointer min-w-[130px]"
          >
            {saving
              ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Saving...</>
              : 'Save application'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}