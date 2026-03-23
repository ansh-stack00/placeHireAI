import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const board_id = searchParams.get('board_id')

    // Get all user's boards if no specific board
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('user_id', user.id)

    const boardIds = board_id
      ? [board_id]
      : (boards?.map((b) => b.id) ?? [])

    if (!boardIds.length) {
      return NextResponse.json({ stats: getEmptyStats() })
    }

    // Fetch all applications
    const { data: apps } = await supabase
      .from('applications')
      .select('id, status, resume_id, applied_at, updated_at, company_name')
      .in('board_id', boardIds)

    const applications = apps ?? []
    const total        = applications.length
    const nonWishlist  = applications.filter((a) => a.status !== 'wishlist')
    const responded    = applications.filter(
      (a) => !['wishlist', 'applied'].includes(a.status)
    )

    // Funnel counts
    const funnel = {
      wishlist:     applications.filter((a) => a.status === 'wishlist').length,
      applied:      applications.filter((a) => a.status === 'applied').length,
      oa_test:      applications.filter((a) => a.status === 'oa_test').length,
      interview_r1: applications.filter((a) => a.status === 'interview_r1').length,
      interview_r2: applications.filter((a) => a.status === 'interview_r2').length,
      offer:        applications.filter((a) => a.status === 'offer').length,
      rejected:     applications.filter((a) => a.status === 'rejected').length,
      ghosted:      applications.filter((a) => a.status === 'ghosted').length,
    }

    // Average days to first response
    const responseTimes = responded
      .filter((a) => a.applied_at && a.updated_at)
      .map((a) => {
        const applied  = new Date(a.applied_at!).getTime()
        const updated  = new Date(a.updated_at).getTime()
        return Math.max(0, Math.floor((updated - applied) / (1000 * 60 * 60 * 24)))
      })
    const avgDaysToReply = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null

    // Resume performance
    const resumeIds = [...new Set(applications.map((a) => a.resume_id).filter(Boolean))]
    const { data: resumes } = await supabase
      .from('resumes')
      .select('id, label')
      .in('id', resumeIds as string[])

    const resumeStats = (resumes ?? []).map((r) => {
      const resumeApps = applications.filter((a) => a.resume_id === r.id)
      const callbacks  = resumeApps.filter(
        (a) => !['wishlist', 'applied', 'rejected', 'ghosted'].includes(a.status)
      )
      return {
        id:                r.id,
        label:             r.label,
        total_applications: resumeApps.length,
        callback_rate:     resumeApps.length
          ? Math.round((callbacks.length / resumeApps.length) * 100)
          : 0,
      }
    }).sort((a, b) => b.callback_rate - a.callback_rate)

    // Recent activity (last 10 status changes)
    const recent = [...applications]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
      .map((a) => ({
        company_name: a.company_name,
        status:       a.status,
        updated_at:   a.updated_at,
      }))

    return NextResponse.json({
      stats: {
        total,
        response_rate: nonWishlist.length
          ? Math.round((responded.length / nonWishlist.length) * 100)
          : 0,
        avg_days_to_reply: avgDaysToReply,
        offers:            funnel.offer,
        funnel,
        resume_stats:      resumeStats,
        recent_activity:   recent,
      },
    })

  } catch (err) {
    console.error('[analytics GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getEmptyStats() {
  return {
    total: 0, response_rate: 0, avg_days_to_reply: null, offers: 0,
    funnel: { wishlist: 0, applied: 0, oa_test: 0, interview_r1: 0, interview_r2: 0, offer: 0, rejected: 0, ghosted: 0 },
    resume_stats: [], recent_activity: [],
  }
}