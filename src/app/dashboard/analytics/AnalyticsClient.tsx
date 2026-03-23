'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Clock, Award } from 'lucide-react'

interface Stats {
  total: number
  response_rate: number
  avg_days_to_reply: number | null
  offers: number
  funnel: Record<string, number>
  resume_stats: Array<{ id: string; label: string; total_applications: number; callback_rate: number }>
  recent_activity: Array<{ company_name: string; status: string; updated_at: string }>
}

const FUNNEL_LABELS: Record<string, string> = {
  applied:      'Applied',
  oa_test:      'OA / Test',
  interview_r1: 'Interview R1',
  interview_r2: 'Interview R2+',
  offer:        'Offer',
  rejected:     'Rejected',
}

const FUNNEL_COLORS: Record<string, string> = {
  applied:      '#534AB7',
  oa_test:      '#854F0B',
  interview_r1: '#185FA5',
  interview_r2: '#3B6D11',
  offer:        '#0F6E56',
  rejected:     '#993C1D',
}

const STATUS_LABELS: Record<string, string> = {
  wishlist:     'Wishlist',
  applied:      'Applied',
  oa_test:      'OA / Test',
  interview_r1: 'Interview R1',
  interview_r2: 'Interview R2+',
  offer:        'Offer',
  rejected:     'Rejected',
  ghosted:      'Ghosted',
}

export default function AnalyticsClient({ activeBoardId }: { activeBoardId: string | null }) {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const url = activeBoardId
        ? `/api/analytics?board_id=${activeBoardId}`
        : '/api/analytics'
      const res  = await fetch(url)
      const data = await res.json()
      setStats(data.stats)
      setLoading(false)
    }
    load()
  }, [activeBoardId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const maxFunnelValue = Math.max(
    ...Object.values(FUNNEL_LABELS).map((_, i) =>
      stats.funnel[Object.keys(FUNNEL_LABELS)[i]] ?? 0
    ), 1
  )

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Analytics</h1>
          <p className="text-[14px] text-slate-400">
            Track your job search performance across all applications.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total applied',    value: stats.total,                  suffix: '',  color: '#534AB7', icon: BarChart3   },
            { label: 'Response rate',    value: stats.response_rate,          suffix: '%', color: '#D4537E', icon: TrendingUp  },
            { label: 'Avg days to reply',value: stats.avg_days_to_reply ?? 0, suffix: 'd', color: '#185FA5', icon: Clock       },
            { label: 'Offers',           value: stats.offers,                 suffix: '',  color: '#0F6E56', icon: Award       },
          ].map(({ label, value, suffix, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
              <p className="font-display text-3xl font-bold" style={{ color }}>
                {value}{suffix}
              </p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">

          {/* Funnel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-display font-semibold text-slate-800 text-[14px] mb-4">
              Application funnel
            </h2>
            {stats.total === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-6">
                No applications yet
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {Object.entries(FUNNEL_LABELS).map(([key, label]) => {
                  const count = stats.funnel[key] ?? 0
                  const pct   = Math.round((count / Math.max(stats.funnel.applied || stats.total, 1)) * 100)
                  const color = FUNNEL_COLORS[key]
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-slate-500">{label}</span>
                        <span className="text-[12px] font-semibold text-slate-700">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width:      `${Math.max(count > 0 ? 4 : 0, pct)}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Resume performance */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-display font-semibold text-slate-800 text-[14px] mb-4">
              Resume performance
            </h2>
            {stats.resume_stats.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-6">
                Link resumes to applications to see performance
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {stats.resume_stats.map((r) => {
                  const rate  = r.callback_rate
                  const color = rate >= 50 ? '#0F6E56' : rate >= 25 ? '#854F0B' : '#993C1D'
                  const bg    = rate >= 50 ? '#E1F5EE' : rate >= 25 ? '#FAEEDA' : '#FAECE7'
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">{r.label}</p>
                        <p className="text-[11px] text-slate-400">{r.total_applications} applications</p>
                      </div>
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ color, background: bg }}
                      >
                        {rate}% callback
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-display font-semibold text-slate-800 text-[14px] mb-4">
            Recent activity
          </h2>
          {stats.recent_activity.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-6">No activity yet</p>
          ) : (
            <div className="flex flex-col gap-0">
              {stats.recent_activity.map((item, i) => {
                const color = FUNNEL_COLORS[item.status] ?? '#888780'
                const date  = new Date(item.updated_at)
                const ago   = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
                const label = ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : `${ago}d ago`
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-semibold text-slate-800">{item.company_name}</span>
                      <span className="text-[13px] text-slate-400"> → {STATUS_LABELS[item.status] ?? item.status}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">{label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}