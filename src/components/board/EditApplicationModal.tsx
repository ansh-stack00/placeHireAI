'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Application } from '@/types'
import { Button } from '@/components/ui/button'
import { X, Loader2, Sparkles, FileText, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  application: Application
  userId:      string
  onClose:     () => void
  onUpdated:   (app: Application) => void
}

interface Resume { id: string; label: string }

const SOURCES  = ['LinkedIn', 'Company website', 'Referral', 'Campus portal', 'Naukri', 'Internshala', 'Other']
const STATUSES = [
  { value: 'wishlist',      label: 'Wishlist'      },
  { value: 'applied',       label: 'Applied'       },
  { value: 'oa_test',       label: 'OA / Test'     },
  { value: 'interview_r1',  label: 'Interview R1'  },
  { value: 'interview_r2',  label: 'Interview R2+' },
  { value: 'offer',         label: 'Offer'         },
  { value: 'rejected',      label: 'Rejected'      },
  { value: 'ghosted',       label: 'Ghosted'       },
]

// ── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({
  tags, onChange, placeholder, color = '#534AB7', bg = '#EEEDFE',
}: {
  tags: string[]; onChange: (tags: string[]) => void
  placeholder: string; color?: string; bg?: string
}) {
  const [input, setInput] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  function addTag(val: string) {
    const t = val.trim().replace(/,/g, '')
    if (!t || tags.includes(t)) return
    onChange([...tags, t])
    setInput('')
  }

  function removeTag(tag: string) { onChange(tags.filter((t) => t !== tag)) }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
    if (e.key === 'Backspace' && !input && tags.length > 0) removeTag(tags[tags.length - 1])
  }

  return (
    <div
      className="min-h-[42px] w-full border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#534AB7]/20 focus-within:border-[#534AB7] transition-colors"
      onClick={() => ref.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag) }} className="hover:opacity-60 cursor-pointer">×</button>
        </span>
      ))}
      <input
        ref={ref}
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EditApplicationModal({ application, userId, onClose, onUpdated }: Props) {
  const supabase = createClient()

  const [form, setForm] = useState({
    company_name: application.company_name  ?? '',
    role_title:   application.role_title    ?? '',
    location:     application.location      ?? '',
    salary_range: application.salary_range  ?? '',
    source:       application.source        ?? 'LinkedIn',
    status:       application.status        ?? 'applied',
    jd_snapshot:  application.jd_snapshot   ?? '',
    applied_at:   application.applied_at
      ? new Date(application.applied_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    hr_name:      application.hr_name       ?? '',
    hr_linkedin:  application.hr_linkedin   ?? '',
    referral_by:  application.referral_by   ?? '',
  })

  const [techStack,      setTechStack]      = useState<string[]>(application.tech_stack      ?? [])
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>(application.must_have_skills ?? [])

  const [resumes,          setResumes]          = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(application.resume_id ?? null)
  const [loadingResumes,   setLoadingResumes]   = useState(false)

  const [showJD,   setShowJD]   = useState(false) // collapsed by default since JD may already exist
  const [parsing,  setParsing]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  // Fetch resumes
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

  // ── Parse JD ──────────────────────────────────────────────────────────────
  async function parseJD() {
    const jdText = form.jd_snapshot.trim()
    if (!jdText || jdText.length < 50) { toast.error('Paste a full JD first'); return }

    setParsing(true)
    try {
      const res  = await fetch('/api/ai/parse-jd', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jd_text: jdText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')

      setForm((prev) => ({
        ...prev,
        company_name: data.company_name || prev.company_name,
        role_title:   data.role_title   || prev.role_title,
        location:     data.location     || prev.location,
        salary_range: data.salary_range || prev.salary_range,
      }))

      if (Array.isArray(data.tech_stack) && data.tech_stack.length > 0) {
        setTechStack((prev) => [...new Set([...prev, ...data.tech_stack])])
      }
      if (Array.isArray(data.must_have_skills) && data.must_have_skills.length > 0) {
        setMustHaveSkills((prev) => [...new Set([...prev, ...data.must_have_skills])])
      }

      setShowJD(false)
      toast.success('JD parsed — fields updated')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to parse JD')
    } finally {
      setParsing(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return }
    if (!form.role_title.trim())   { toast.error('Role title is required');   return }

    setSaving(true)
    try {
      const res  = await fetch(`/api/applications/${application.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name:     form.company_name.trim(),
          role_title:       form.role_title.trim(),
          location:         form.location     || null,
          salary_range:     form.salary_range || null,
          source:           form.source       || null,
          status:           form.status,
          jd_snapshot:      form.jd_snapshot  || null,
          applied_at:       form.applied_at
                              ? new Date(form.applied_at).toISOString()
                              : null,
          hr_name:          form.hr_name      || null,
          hr_linkedin:      form.hr_linkedin  || null,
          referral_by:      form.referral_by  || null,
          resume_id:        selectedResumeId  ?? null,
          tech_stack:       techStack.length      > 0 ? techStack      : null,
          must_have_skills: mustHaveSkills.length > 0 ? mustHaveSkills : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')

      onUpdated(data.application as Application)
      toast.success('Application updated!')
    } catch (err: any) {
      console.error('[EditApplicationModal] save error:', err)
      toast.error(err.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-display font-bold text-slate-900 text-[16px]">Edit application</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* ── Company + Role ──────────────────────────────────────────── */}
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

          {/* ── Location + Salary ────────────────────────────────────────── */}
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

          {/* ── Source + Status ──────────────────────────────────────────── */}
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
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors bg-white"
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Date + HR name ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Date applied</label>
              <input
                type="date"
                value={form.applied_at}
                onChange={(e) => set('applied_at', e.target.value)}
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">HR name</label>
              <input
                value={form.hr_name}
                onChange={(e) => set('hr_name', e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
              />
            </div>
          </div>

          {/* ── Referral ─────────────────────────────────────────────────── */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Referred by</label>
            <input
              value={form.referral_by}
              onChange={(e) => set('referral_by', e.target.value)}
              placeholder="e.g. Rahul Gupta (ex-Google)"
              className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
            />
          </div>

          {/* ── JD Snapshot ──────────────────────────────────────────────── */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowJD(!showJD)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#534AB7]" />
                <span className="text-[13px] font-semibold text-slate-700">Job description</span>
                {form.jd_snapshot && (
                  <span className="text-[10px] bg-[#E1F5EE] text-[#0F6E56] px-2 py-0.5 rounded-full font-medium">
                    Saved ✓
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
                <textarea
                  value={form.jd_snapshot}
                  onChange={(e) => set('jd_snapshot', e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={6}
                  className="w-full text-[13px] border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                />
                <Button
                  onClick={parseJD}
                  disabled={!form.jd_snapshot.trim() || parsing}
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

          {/* ── Must-have skills ──────────────────────────────────────────── */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Must-have skills
            </label>
            <p className="text-[11px] text-slate-400 mb-1.5">
              Press <kbd className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">Enter</kbd> or <kbd className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">,</kbd> to add
            </p>
            <TagInput
              tags={mustHaveSkills}
              onChange={setMustHaveSkills}
              placeholder="e.g. React, Node.js, System Design..."
              color="#534AB7"
              bg="#EEEDFE"
            />
          </div>

          {/* ── Tech stack ───────────────────────────────────────────────── */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Tech stack
            </label>
            <p className="text-[11px] text-slate-400 mb-1.5">Technologies mentioned in the JD</p>
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
                <Loader2 size={12} className="animate-spin" /> Loading...
              </div>
            ) : resumes.length === 0 ? (
              <div className="flex items-center gap-2 text-[12px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
                <FileText size={13} />
                No resumes yet —{' '}
                <a href="/dashboard/resumes" target="_blank" className="text-[#534AB7] hover:underline font-medium">upload one</a>
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
              : 'Save changes'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}