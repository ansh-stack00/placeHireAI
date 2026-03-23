'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, LayoutGrid, FileText, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  userId: string
  onComplete: (boardName: string) => void
}

const STEPS = [
  {
    num: 1,
    icon: LayoutGrid,
    title: 'Name your board',
    desc: 'Create a board for this placement season or job search.',
  },
  {
    num: 2,
    icon: FileText,
    title: 'How it works',
    desc: 'Add applications, drag them across stages, prep with AI.',
  },
  {
    num: 3,
    icon: CheckCircle2,
    title: "You're all set",
    desc: 'Start tracking your first application.',
  },
]

export default function OnboardingFlow({ userId, onComplete }: Props) {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [boardName, setBoardName] = useState('My Applications')
  const [season, setSeason] = useState('2025')
  const [saving, setSaving] = useState(false)

  async function handleFinish() {
  setSaving(true)
  try {
    // Update board name
    await supabase
      .from('boards')
      .update({ name: boardName, season })
      .eq('user_id', userId)

    // Mark onboarding complete — use upsert to handle any edge cases
    const { error } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', userId)

    if (error) {
      console.error('Failed to mark onboarding complete:', error)
      // Still proceed — don't block the user
    }
  } finally {
    setSaving(false)
    onComplete(boardName)
  }
}

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="transition-all duration-300"
              style={{
                width:  step >= s.num ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: step >= s.num ? '#534AB7' : '#e2e8f0',
              }}
            />
          ))}
        </div>

        {/* Step 1 — Name your board */}
        {step === 1 && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mb-6 mx-auto">
              <LayoutGrid size={24} className="text-[#534AB7]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 text-center mb-2">
              Name your board
            </h2>
            <p className="text-slate-400 text-[14px] text-center mb-8">
              Give this job search a name — you can create multiple boards later.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Board name
                </label>
                <input
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="e.g. Campus Placements 2025"
                  className="w-full text-[14px] border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Season / year
                </label>
                <input
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="e.g. 2025"
                  className="w-full text-[14px] border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-colors"
                />
              </div>
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!boardName.trim()}
              className="w-full mt-6 bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl h-12 text-[14px] font-semibold cursor-pointer"
            >
              Continue <ArrowRight size={16} className="ml-2" />
            </Button>
            <button
              onClick={() => onComplete('My Applications')}
              className="w-full mt-3 text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 2 — How it works */}
        {step === 2 && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mb-6 mx-auto">
              <FileText size={24} className="text-[#0F6E56]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 text-center mb-2">
              How PlaceHire works
            </h2>
            <p className="text-slate-400 text-[14px] text-center mb-8">
              Three things that make your job search 10x better.
            </p>
            <div className="space-y-3">
              {[
                { icon: '⊞', color: '#534AB7', bg: '#EEEDFE', title: 'Kanban board', desc: 'Drag applications across stages — Wishlist to Offer.' },
                { icon: '◈', color: '#D4537E', bg: '#FBEAF0', title: 'AI interview prep', desc: 'Get company-specific questions before every interview.' },
                { icon: '✉', color: '#185FA5', bg: '#E6F1FB', title: 'Gmail auto-detection', desc: 'CC your unique address — cards move automatically.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0"
                    style={{ background: item.bg, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{item.title}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setStep(3)}
              className="w-full mt-6 bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl h-12 text-[14px] font-semibold cursor-pointer"
            >
              Got it <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        )}

        {/* Step 3 — All set */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E1F5EE] flex items-center justify-center mb-6 mx-auto">
              <CheckCircle2 size={24} className="text-[#0F6E56]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">
              You are all set!
            </h2>
            <p className="text-slate-400 text-[14px] mb-2">
              Your board <span className="font-semibold text-slate-700">{boardName}</span> is ready.
            </p>
            <p className="text-slate-400 text-[13px] mb-8">
              Add your first application to get started.
            </p>
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="w-full bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl h-12 text-[14px] font-semibold cursor-pointer"
            >
              {saving ? 'Setting up...' : 'Go to my board'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}