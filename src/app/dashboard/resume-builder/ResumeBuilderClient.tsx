'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ResumeData } from '@/types/resume'
import { Button } from '@/components/ui/button'
import {
  Sparkles, Download, Loader2,
  CheckCircle2, RotateCcw, Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ClassicTemplate from '@/components/resume-builder/templates/ClassicTemplate'
import ModernTemplate  from '@/components/resume-builder/templates/ModernTemplate'

const PDFViewerDynamic = dynamic(
  () =>
    import('@react-pdf/renderer').then((mod) => {
      const { PDFViewer } = mod
      return function PDFViewerWrapper({ children }: { children: React.ReactNode }) {
        return (
          <PDFViewer width="100%" height={700} showToolbar={false}>
            {/* @ts-ignore */}
            {children}
          </PDFViewer>
        )
      }
    }),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-2xl">
      <Loader2 size={20} className="animate-spin text-slate-300" />
    </div>
  )}
)

const TEMPLATES = [
  { id: 'classic', label: 'Classic', desc: 'Clean single-column. Best ATS compatibility.',   color: '#534AB7' },
  { id: 'modern',  label: 'Modern',  desc: '2-column with dark sidebar. Stands out visually.', color: '#1e1b4b' },
]

function ATSScore({ keywords }: { keywords: string[] }) {
  const score = Math.min(100, 60 + keywords.length * 4)
  const color = score >= 80 ? '#0F6E56' : score >= 60 ? '#854F0B' : '#993C1D'
  const bg    = score >= 80 ? '#E1F5EE' : score >= 60 ? '#FAEEDA' : '#FAECE7'
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold" style={{ background: bg, color }}>
      <CheckCircle2 size={13} />
      ATS Score: {score}/100
      <span className="font-normal text-[11px] ml-1">({keywords.length} keywords matched)</span>
    </div>
  )
}


function DownloadButton({
  resumeData,
  template,
  fileName,
  size = 'default',
}: {
  resumeData:  ResumeData
  template:    'classic' | 'modern'
  fileName:    string
  size?:       'default' | 'lg'
}) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')

      const doc = template === 'modern'
        ? <ModernTemplate  data={resumeData} />
        : <ClassicTemplate data={resumeData} />

      const blob = await pdf(doc).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch (err) {
      console.error('[download]', err)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={downloading}
      className={`bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl cursor-pointer font-semibold
        ${size === 'lg' ? 'text-[14px] h-12 px-8' : 'text-[13px]'}`}
    >
      {downloading
        ? <><Loader2 size={size === 'lg' ? 15 : 13} className="mr-1.5 animate-spin" />Preparing PDF...</>
        : <><Download size={size === 'lg' ? 15 : 13} className="mr-1.5" />Download PDF</>
      }
    </Button>
  )
}


export default function ResumeBuilderClient() {
  const [step,        setStep]        = useState<'input' | 'result'>('input')
  const [template,    setTemplate]    = useState<'classic' | 'modern'>('classic')
  const [resumeText,  setResumeText]  = useState('')
  const [jdText,      setJdText]      = useState('')
  const [building,    setBuilding]    = useState(false)
  const [resumeData,  setResumeData]  = useState<ResumeData | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  async function handleBuild() {
    if (!resumeText.trim()) { toast.error('Paste your existing resume'); return }
    if (!jdText.trim())     { toast.error('Paste the job description');  return }
    if (resumeText.trim().length < 100) { toast.error('Resume too short — paste more content'); return }

    setBuilding(true)
    try {
      const res  = await fetch('/api/ai/build-resume', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resume_text: resumeText, jd_text: jdText, template }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to build resume')
      setResumeData(data.resume)
      setStep('result')
      toast.success('Resume tailored successfully!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to build resume')
    } finally {
      setBuilding(false)
    }
  }

  function updatePersonal(field: string, value: string) {
    if (!resumeData) return
    setResumeData({ ...resumeData, personal: { ...resumeData.personal, [field]: value } })
  }

  function updateSummary(value: string) {
    if (!resumeData) return
    setResumeData({ ...resumeData, summary: value })
  }

  function updateExpBullet(expIdx: number, bulletIdx: number, value: string) {
    if (!resumeData) return
    const exp = [...resumeData.experience]
    exp[expIdx] = { ...exp[expIdx], bullets: exp[expIdx].bullets.map((b, i) => i === bulletIdx ? value : b) }
    setResumeData({ ...resumeData, experience: exp })
  }

  const fileName = resumeData?.personal?.name
    ? `${resumeData.personal.name.replace(/\s/g, '_')}_Resume.pdf`
    : 'Resume.pdf'

 
  if (step === 'input') {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">AI Resume Builder</h1>
          <p className="text-[14px] text-slate-400">
            Paste your existing resume + a job description. AI rewrites it to match the role in seconds.
          </p>
        </div>

        {/* Template picker */}
        <div className="mb-6">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-3">Choose template</label>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id as any)}
                className="flex flex-col gap-1.5 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer"
                style={template === t.id
                  ? { borderColor: t.color, background: t.color + '08' }
                  : { borderColor: '#e2e8f0', background: 'white' }
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold" style={{ color: template === t.id ? t.color : '#374151' }}>
                    {t.label}
                  </span>
                  {template === t.id && <CheckCircle2 size={14} style={{ color: t.color }} />}
                </div>
                <span className="text-[11px] text-slate-400">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Resume */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Your existing resume</label>
            <p className="text-[11px] text-slate-400 mb-3">Paste the text from your PDF or Word doc.</p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder={`John Doe\njohn@email.com | +91 98765 43210 | Bengaluru\n\nEXPERIENCE\nSoftware Engineer at Acme Corp (Jan 2022 - Present)\n• Built REST APIs using Node.js...\n\nEDUCATION\nB.Tech Computer Science, IIT Delhi (2018-2022)`}
              rows={12}
              className="w-full text-[13px] border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors font-mono"
            />
            {resumeText && (
              <p className="text-[11px] text-slate-400 mt-1.5">
                {resumeText.split(/\s+/).filter(Boolean).length} words
              </p>
            )}
          </div>

          {/* JD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Target job description</label>
            <p className="text-[11px] text-slate-400 mb-3">Paste the full JD of the role you're applying to.</p>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the job description here..."
              rows={8}
              className="w-full text-[13px] border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
            />
          </div>

          <Button
            onClick={handleBuild}
            disabled={building || !resumeText.trim() || !jdText.trim()}
            className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl text-[14px] h-12 font-semibold cursor-pointer"
          >
            {building
              ? <><Loader2 size={16} className="mr-2 animate-spin" />Building your resume...</>
              : <><Sparkles size={16} className="mr-2" />Build tailored resume</>
            }
          </Button>

          {building && (
            <p className="text-[12px] text-slate-400 text-center -mt-2">This takes about 10–15 seconds...</p>
          )}
        </div>
      </div>
    )
  }

  
  if (!resumeData) return null

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Your tailored resume</h1>
          <p className="text-[14px] text-slate-400">Edit any field, then download as PDF.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStep('input')}
            className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 cursor-pointer px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <RotateCcw size={13} /> Start over
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-[13px] text-[#534AB7] cursor-pointer px-3 py-2 rounded-xl border border-[#534AB7]/30 hover:bg-[#EEEDFE] transition-colors"
          >
            <Eye size={13} /> {showPreview ? 'Hide preview' : 'PDF preview'}
          </button>
          <DownloadButton resumeData={resumeData} template={template} fileName={fileName} />
        </div>
      </div>

      {/* ATS Score */}
      <div className="mb-4">
        <ATSScore keywords={resumeData.ats_keywords} />
      </div>

      {/* PDF Preview — PDFViewer loaded dynamically, template passed as child */}
      {showPreview && (
        <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <PDFViewerDynamic>
            {template === 'modern'
              ? <ModernTemplate  data={resumeData} />
              : <ClassicTemplate data={resumeData} />
            }
          </PDFViewerDynamic>
        </div>
      )}

      {/* Editable sections */}
      <div className="flex flex-col gap-4">

        {/* Personal info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-display font-semibold text-slate-800 text-[14px] mb-4">Personal info</h3>
          <div className="grid grid-cols-2 gap-3">
            {([
              { field: 'name',      label: 'Full name' },
              { field: 'email',     label: 'Email'     },
              { field: 'phone',     label: 'Phone'     },
              { field: 'location',  label: 'Location'  },
              { field: 'linkedin',  label: 'LinkedIn'  },
              { field: 'github',    label: 'GitHub'    },
              { field: 'portfolio', label: 'Portfolio' },
            ] as const).map(({ field, label }) => (
              <div key={field}>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">{label}</label>
                <input
                  value={(resumeData.personal as any)[field] ?? ''}
                  onChange={(e) => updatePersonal(field, e.target.value)}
                  className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-display font-semibold text-slate-800 text-[14px] mb-3">Professional summary</h3>
          <textarea
            value={resumeData.summary}
            onChange={(e) => updateSummary(e.target.value)}
            rows={4}
            className="w-full text-[13px] border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
          />
        </div>

        {/* Experience */}
        {resumeData.experience.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-display font-semibold text-slate-800 text-[14px] mb-4">Experience</h3>
            {resumeData.experience.map((exp, expIdx) => (
              <div
                key={expIdx}
                className={expIdx < resumeData.experience.length - 1 ? 'mb-6 pb-6 border-b border-slate-100' : ''}
              >
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Company</label>
                    <input
                      value={exp.company}
                      onChange={(e) => {
                        const updated = [...resumeData.experience]
                        updated[expIdx] = { ...exp, company: e.target.value }
                        setResumeData({ ...resumeData, experience: updated })
                      }}
                      className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Role</label>
                    <input
                      value={exp.role}
                      onChange={(e) => {
                        const updated = [...resumeData.experience]
                        updated[expIdx] = { ...exp, role: e.target.value }
                        setResumeData({ ...resumeData, experience: updated })
                      }}
                      className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                    />
                  </div>
                </div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Bullet points</label>
                {exp.bullets.map((bullet, bulletIdx) => (
                  <div key={bulletIdx} className="flex items-start gap-2 mb-2">
                    <span className="text-[#534AB7] mt-2.5 flex-shrink-0">•</span>
                    <textarea
                      value={bullet}
                      onChange={(e) => updateExpBullet(expIdx, bulletIdx, e.target.value)}
                      rows={2}
                      className="flex-1 text-[12px] border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-display font-semibold text-slate-800 text-[14px] mb-4">Skills</h3>
          <div className="flex flex-col gap-3">
            {(['languages', 'frameworks', 'databases', 'tools', 'other'] as const).map((cat) => (
              <div key={cat}>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1 capitalize">{cat}</label>
                <input
                  value={(resumeData.skills[cat] ?? []).join(', ')}
                  onChange={(e) => {
                    const vals = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    setResumeData({ ...resumeData, skills: { ...resumeData.skills, [cat]: vals } })
                  }}
                  placeholder={`Add ${cat} separated by commas...`}
                  className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ATS Keywords */}
        {resumeData.ats_keywords.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-display font-semibold text-slate-800 text-[14px] mb-2">ATS Keywords matched</h3>
            <p className="text-[12px] text-slate-400 mb-3">
              These keywords from the JD appear in your resume — they help you pass ATS filters.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {resumeData.ats_keywords.map((kw, i) => (
                <span key={i} className="text-[11px] bg-[#EEEDFE] text-[#534AB7] px-2.5 py-1 rounded-full font-medium">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Download at bottom */}
        <div className="flex justify-center pb-4">
          <DownloadButton resumeData={resumeData} template={template} fileName={fileName} size="lg" />
        </div>
      </div>
    </div>
  )
}