'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Sparkles,
  Zap,
  BarChart3,
  Mail,
  FileSearch,
  CheckCircle2,
  Star,
  ChevronRight,
  BrainCircuit,
  Target,
  TrendingUp,
  LayoutGrid,
} from 'lucide-react'

// ─── useCountUp ───────────────────────────────────────────────────────────────
function useCountUp(target: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!start) return

    let startTime: number | null = null

    const tick = (now: number) => {
      if (!startTime) startTime = now
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [start, target, duration])

  return count
}

// ─── useScrollInView ──────────────────────────────────────────────────────────
// Uses a div ref (HTMLDivElement — no casting needed).
// Falls back to window scroll if IntersectionObserver isn't available.
function useScrollInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Method 1: IntersectionObserver (modern browsers)
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setInView(true)
              observer.disconnect()
            }
          })
        },
        { threshold: 0.1 }
      )
      observer.observe(el)
      return () => observer.disconnect()
    }

    // Method 2: scroll fallback
    const check = () => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight - 80) {
        setInView(true)
        window.removeEventListener('scroll', check)
      }
    }
    check() // run once immediately in case already visible
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  return { ref, inView }
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────
function KanbanCard({
  company, role, stage, stageColor, stageBg, resume, delay, animClass,
}: {
  company: string; role: string; stage: string
  stageColor: string; stageBg: string
  resume: string; delay: string; animClass: string
}) {
  return (
    <div
      className={`glass rounded-2xl p-3.5 w-52 shadow-xl ${animClass}`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
          {company.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-display text-[12px] font-semibold text-slate-800 leading-none">{company}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: stageColor, background: stageBg }}
        >
          {stage}
        </span>
        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{resume}</span>
      </div>
    </div>
  )
}

// ─── FeatureCard ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, desc, color, delay, inView,
}: {
  icon: React.ElementType; title: string; desc: string
  color: string; delay: string; inView: boolean
}) {
  return (
    <div
      className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 cursor-default"
      style={{
        transform: inView ? 'translateY(0)' : 'translateY(18px)',
        transition: `transform 0.5s ease ${delay}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200"
        style={{ background: color + '18' }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <h3 className="font-display font-semibold text-slate-900 mb-2 text-[15px]">{title}</h3>
      <p className="text-[13px] text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}

// ─── Ticker items ─────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  'Kanban board', 'AI interview prep', 'JD auto-parser',
  'Resume scoring', 'Gmail sync', 'Analytics dashboard',
  'Stage tracking', 'Offer comparison', 'Interview notes',
  'Rejection analysis', 'Company briefings', 'Question bank',
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  // Each section has its own div ref — no HTMLElement casting
  const statsView    = useScrollInView()
  const featuresView = useScrollInView()
  const howView      = useScrollInView()

  // Counters start when the stats div enters viewport
  const appsCount   = useCountUp(2847, 2200, statsView.inView)
  const usersCount  = useCountUp(1200, 1900, statsView.inView)
  const offersCount = useCountUp(94,   1600, statsView.inView)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const featureList = [
    { icon: LayoutGrid,   title: 'Kanban board',         color: '#534AB7', desc: 'Visual pipeline from Wishlist to Offer. Drag cards between stages. Everything in one place.' },
    { icon: BrainCircuit, title: 'AI interview prep',    color: '#D4537E', desc: 'Claude generates company-specific questions, context briefs, and system design scenarios before every interview.' },
    { icon: FileSearch,   title: 'JD auto-parser',       color: '#854F0B', desc: 'Paste a job description and the card fills itself — role, location, salary, tech stack, required skills.' },
    { icon: Target,       title: 'Resume vs JD scoring', color: '#0F6E56', desc: 'AI scores your resume against any JD across 4 dimensions. Get 3 specific edits to improve your match.' },
    { icon: Mail,         title: 'Gmail auto-detection', color: '#185FA5', desc: 'CC your unique address on any application. Cards move automatically when rejections or invites arrive.' },
    { icon: TrendingUp,   title: 'Analytics dashboard',  color: '#993C1D', desc: 'Response rate, funnel conversion, which resume version performs best. Turn data into decisions.' },
  ]

  const stepList = [
    { num: '01', icon: LayoutGrid,   color: '#534AB7', title: 'Add your applications', desc: 'Paste a JD and AI fills the card for you. Or add manually in seconds.' },
    { num: '02', icon: BarChart3,    color: '#D4537E', title: 'Track every stage',      desc: 'Drag cards as you progress. Gmail auto-updates status from your inbox.' },
    { num: '03', icon: BrainCircuit, color: '#0F6E56', title: 'Prep with AI',           desc: 'Before every interview, get questions, company context, and weak-spot analysis.' },
    { num: '04', icon: Zap,          color: '#854F0B', title: 'Land the offer',         desc: 'Compare offers, track your analytics, and understand what is working.' },
  ]

  return (
    <main className="min-h-screen bg-[#FAFAF9] overflow-x-hidden">

      <p className="sr-only">
      PlaceHire is a free job application tracker for campus students and job switchers.
      Track every application with a visual Kanban board, prepare for placements with
      AI company-specific interview prep, match your resume to job descriptions with a
      scoring tool, and build ATS-friendly resumes — all in one place.
  </p>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#534AB7] animate-pulse-glow" />
            <span className="font-display font-bold text-[15px] text-slate-900">PlaceHire</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Features',     href: '#features'     },
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Pricing',      href: '#pricing'      },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-600 text-[13px] cursor-pointer">
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-[#534AB7] hover:bg-[#3C3489] text-white text-[13px] rounded-xl px-4 cursor-pointer">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#534AB7]/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#D4537E]/[0.05] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <div className="animate-fade-up-d1 inline-flex items-center gap-2 bg-[#EEEDFE] text-[#534AB7] rounded-full px-3.5 py-1.5 text-[11px] font-semibold mb-8">
                <Sparkles size={11} />
                AI-powered job tracking
                <span className="bg-[#534AB7] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">NEW</span>
              </div>

              <h1 className="animate-fade-up-d2 font-display text-5xl lg:text-[54px] font-extrabold text-slate-900 leading-[1.08] tracking-tight mb-6">
                Never lose track of a{' '}
                <span className="text-gradient">job application</span>{' '}
                again
              </h1>

              <p className="animate-fade-up-d3 text-[16px] text-slate-500 leading-relaxed mb-10 max-w-lg">
                Kanban board + AI interview prep + Gmail auto-detection.
                Built for placement season and job switches.
              </p>

              <div className="animate-fade-up-d4 flex flex-wrap items-center gap-3 mb-12">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl px-8 h-12 text-[14px] font-semibold shadow-lg shadow-[#534AB7]/25 hover:shadow-[#534AB7]/40 transition-all duration-200 group cursor-pointer"
                  >
                    Start tracking free
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-8 h-12 text-[14px] border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Watch demo
                </Button>
              </div>

              <div className="animate-fade-up-d5 flex items-center gap-4">
                <div className="flex">
                  {(['#534AB7', '#D4537E', '#0F6E56', '#854F0B', '#185FA5'] as const).map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: color, marginLeft: i === 0 ? 0 : '-8px', zIndex: 5 - i, position: 'relative' }}
                    >
                      {['AK', 'PR', 'RV', 'SM', 'TN'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">Loved by 1,200+ job seekers</p>
                </div>
              </div>
            </div>

            {/* Right — floating cards */}
            <div className="animate-fade-in relative h-[480px] hidden lg:block">
              <div className="animate-float absolute top-4 right-16 glass rounded-full px-3.5 py-2 flex items-center gap-2 shadow-md z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-slate-600 font-medium">Auto-updated from Gmail</span>
              </div>

              <div className="animate-card-float-3 absolute top-14 left-0 glass rounded-2xl px-4 py-3 shadow-lg">
                <p className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Applied</p>
                <div className="w-24 h-1.5 bg-[#EEEDFE] rounded-full mb-1" />
                <p className="text-[10px] text-[#534AB7] font-semibold">7 applications</p>
              </div>

              <KanbanCard company="Meesho"   role="SDE-1"        stage="Interview R1" stageColor="#185FA5" stageBg="#E6F1FB" resume="v3" delay="0s"   animClass="absolute top-20 right-0 animate-card-float-1" />
              <KanbanCard company="Swiggy"   role="Backend Eng." stage="Offer"        stageColor="#0F6E56" stageBg="#E1F5EE" resume="v3" delay="0.5s" animClass="absolute top-52 left-4 animate-card-float-2" />
              <KanbanCard company="Razorpay" role="SDE-2"        stage="OA / Test"    stageColor="#854F0B" stageBg="#FAEEDA" resume="v2" delay="1s"   animClass="absolute bottom-16 right-10 animate-card-float-3" />

              <div className="animate-card-float-2 absolute bottom-10 left-0 glass rounded-2xl p-3.5 w-48 shadow-lg" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-4 h-4 rounded-md bg-[#FBEAF0] flex items-center justify-center">
                    <BrainCircuit size={9} className="text-[#D4537E]" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#D4537E]">AI Prep · Meesho</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">Design a scalable notification system for 50M users...</p>
              </div>

              <div className="animate-card-float-1 absolute top-52 right-4 glass rounded-2xl p-3 shadow-lg" style={{ animationDelay: '1.2s' }}>
                <p className="text-[10px] text-slate-400 mb-1">Resume match</p>
                <div className="flex items-end gap-1">
                  <span className="font-display text-2xl font-extrabold text-[#0F6E56] leading-none">87</span>
                  <span className="text-[10px] text-slate-400 mb-0.5">/ 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ticker ─────────────────────────────────────────────── */}
      <div className="border-y border-slate-100 bg-white py-3 overflow-hidden">
        <div className="animate-ticker flex whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-[12px] text-slate-400 flex-shrink-0">
              <span className="w-1 h-1 rounded-full bg-[#534AB7]/40" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      {/*
        THE FIX: ref is on a plain <div> (HTMLDivElement), not <section>.
        useScrollInView returns useRef<HTMLDivElement> — zero casting needed.
        This is what was silently breaking the IntersectionObserver before.
      */}
      <section className="py-20 px-6 bg-white">
        <div ref={statsView.ref} className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 text-center">

            {/* Applications tracked */}
            <div
              style={{
                transform: statsView.inView ? 'translateY(0)' : 'translateY(16px)',
                transition: 'transform 0.6s ease 0s',
              }}
            >
              <div className="font-display font-extrabold leading-none mb-3 tabular-nums" style={{ color: '#534AB7', fontSize: '56px' }}>
                {statsView.inView ? appsCount.toLocaleString('en-IN') : '2,847'}+
              </div>
              <p className="text-[14px] text-slate-400 font-medium">Applications tracked</p>
            </div>

            {/* Active job seekers */}
            <div
              style={{
                transform: statsView.inView ? 'translateY(0)' : 'translateY(16px)',
                transition: 'transform 0.6s ease 0.12s',
              }}
            >
              <div className="font-display font-extrabold leading-none mb-3 tabular-nums" style={{ color: '#D4537E', fontSize: '56px' }}>
                {statsView.inView ? usersCount.toLocaleString('en-IN') : '1,200'}+
              </div>
              <p className="text-[14px] text-slate-400 font-medium">Active job seekers</p>
            </div>

            {/* Users get callbacks */}
            <div
              style={{
                transform: statsView.inView ? 'translateY(0)' : 'translateY(16px)',
                transition: 'transform 0.6s ease 0.24s',
              }}
            >
              <div className="font-display font-extrabold leading-none mb-3 tabular-nums" style={{ color: '#0F6E56', fontSize: '56px' }}>
                {statsView.inView ? offersCount.toLocaleString('en-IN') : '94'}%
              </div>
              <p className="text-[14px] text-slate-400 font-medium">Users get callbacks</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-[#FAFAF9]">
        {/* ref on inner div */}
        <div ref={featuresView.ref} className="max-w-6xl mx-auto">
          <div
            className="text-center mb-16"
            style={{
              transform:  featuresView.inView ? 'translateY(0)' : 'translateY(16px)',
              transition: 'transform 0.6s ease 0s',
            }}
          >
            <Badge className="bg-[#EEEDFE] text-[#534AB7] hover:bg-[#EEEDFE] border-0 mb-4 text-[11px] font-semibold px-3 py-1 rounded-full">
              <Sparkles size={10} className="mr-1" />
              Everything you need
            </Badge>
            <h2 className="font-display text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Built for the job hunt grind
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-[15px] leading-relaxed">
              From first application to signed offer — every tool you need in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureList.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                color={f.color}
                delay={`${i * 0.07}s`}
                inView={featuresView.inView}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div ref={howView.ref} className="max-w-5xl mx-auto">
          <div
            className="text-center mb-16"
            style={{
              transform:  howView.inView ? 'translateY(0)' : 'translateY(16px)',
              transition: 'transform 0.6s ease 0s',
            }}
          >
            <Badge className="bg-[#E1F5EE] text-[#0F6E56] hover:bg-[#E1F5EE] border-0 mb-4 text-[11px] font-semibold px-3 py-1 rounded-full">
              Simple process
            </Badge>
            <h2 className="font-display text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              From chaos to clarity in 4 steps
            </h2>
            <p className="text-slate-500 text-[15px]">
              Designed to reduce friction at every stage of your job search.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stepList.map((step, i) => (
              <div
                key={step.num}
                className="relative group"
                style={{
                  transform:  howView.inView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `transform 0.5s ease ${i * 0.1}s`,
                }}
              >
                {i < stepList.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-full w-full h-px bg-gradient-to-r from-slate-200 to-transparent z-10" />
                )}
                <div className="bg-[#FAFAF9] rounded-2xl p-5 border border-slate-100 group-hover:border-slate-200 group-hover:shadow-md transition-all duration-200 h-full">
                  <div className="font-display text-3xl font-black mb-4 leading-none" style={{ color: step.color, opacity: 0.18 }}>
                    {step.num}
                  </div>
                  <div className="w-9 h-9 rounded-xl mb-4 flex items-center justify-center" style={{ background: step.color + '15' }}>
                    <step.icon size={16} style={{ color: step.color }} />
                  </div>
                  <h3 className="font-display font-bold text-slate-900 mb-2 text-[14px]">{step.title}</h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      {/* No animation on pricing — always fully visible, no transform tricks */}
      <section id="pricing" className="py-24 px-6 bg-[#FAFAF9]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-[#FAEEDA] text-[#854F0B] hover:bg-[#FAEEDA] border-0 mb-4 text-[11px] font-semibold px-3 py-1 rounded-full">
              Simple pricing
            </Badge>
            <h2 className="font-display text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Start free, upgrade when ready
            </h2>
            <p className="text-slate-500 text-[15px]">No credit card required to get started</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Free */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <h3 className="font-display text-xl font-bold text-slate-900 mb-1">Free</h3>
              <p className="text-slate-400 text-[13px] mb-6">Perfect to get started</p>
              <div className="mb-8">
                <span className="font-display text-5xl font-extrabold text-slate-900">₹0</span>
                <span className="text-slate-400 text-[13px] ml-2">forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Up to 15 applications',
                  '2 resume uploads',
                  'Full Kanban board',
                  'Basic analytics',
                  'JD parser (3/month)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                    <CheckCircle2 size={14} className="text-slate-300 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full rounded-xl h-11 border-slate-200 text-slate-700 text-[13px] cursor-pointer">
                  Get started free
                </Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="relative bg-[#534AB7] rounded-2xl p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/[0.04] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="font-display text-xl font-bold text-white mb-1">Pro</h3>
                    <p className="text-white/60 text-[13px]">For serious job hunters</p>
                  </div>
                  <Badge className="bg-white/20 text-white border-0 text-[10px] font-semibold">Most popular</Badge>
                </div>
                <div className="mb-2">
                  <span className="font-display text-5xl font-extrabold text-white">₹79</span>
                  <span className="text-white/50 text-[13px] ml-2">/ month</span>
                </div>
                <p className="text-white/40 text-[11px] mb-8">or ₹610/year · save 30%</p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Unlimited applications',
                    'Unlimited resumes',
                    'AI interview prep',
                    'Resume vs JD scoring',
                    'Gmail auto-detection',
                    'Rejection pattern analysis',
                    'Weekly AI strategy digest',
                    'Priority support',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[13px] text-white/85">
                      <CheckCircle2 size={14} className="text-white/50 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button className="w-full rounded-xl h-11 bg-white text-[#534AB7] hover:bg-white/90 text-[13px] font-semibold cursor-pointer">
                    Start 7-day free trial
                    <ChevronRight size={15} className="ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <p className="text-center text-[13px] text-slate-400 mt-8">
            Are you a college placement cell?{' '}
            <a href="mailto:hello@placehire.app" className="text-[#534AB7] hover:underline">
              Contact us for bulk pricing
            </a>
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-float inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EEEDFE] mb-8">
            <Zap size={22} className="text-[#534AB7]" />
          </div>
          <h2 className="font-display text-4xl font-extrabold text-slate-900 tracking-tight mb-5 leading-tight">
            Your next offer is{' '}
            <span className="text-gradient">one application away</span>
          </h2>
          <p className="text-slate-500 mb-10 text-[15px] leading-relaxed">
            Join 1,200+ students and professionals who track smarter, prep better, and land faster.
          </p>
          <Link href="/login">
            <Button
              size="lg"
              className="bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-xl px-10 h-13 text-[15px] font-semibold shadow-lg shadow-[#534AB7]/25 hover:shadow-[#534AB7]/40 transition-all duration-200 group cursor-pointer"
            >
              Get started free
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-[11px] text-slate-400 mt-4">
            No credit card · Free for 15 applications · Upgrade anytime
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8 px-6 bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#534AB7]" />
            <span className="font-display font-bold text-slate-800 text-[13px]">PlaceHire</span>
          </div>
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} PlaceHire. Built for job hunters.
          </p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map((item) => (
              <a key={item} href="#" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </main>
  )
}