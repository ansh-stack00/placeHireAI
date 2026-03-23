import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'resume'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // For each resume compute: total applications used + callback rate
    const resumeIds = (resumes ?? []).map((r) => r.id)

    const { data: appStats } = resumeIds.length
      ? await supabase
          .from('applications')
          .select('resume_id, status')
          .in('resume_id', resumeIds)
      : { data: [] }

    // Build stats map
    const statsMap: Record<string, { total: number; callbacks: number }> = {}
    for (const app of appStats ?? []) {
      if (!app.resume_id) continue
      if (!statsMap[app.resume_id]) {
        statsMap[app.resume_id] = { total: 0, callbacks: 0 }
      }
      statsMap[app.resume_id].total++
      // Callback = moved past applied stage (not wishlist/applied/rejected/ghosted)
      if (!['wishlist', 'applied', 'rejected', 'ghosted'].includes(app.status)) {
        statsMap[app.resume_id].callbacks++
      }
    }

    const resumesWithStats = (resumes ?? []).map((r) => ({
      ...r,
      total_applications: statsMap[r.id]?.total ?? 0,
      callback_rate:      statsMap[r.id]?.total
        ? Math.round((statsMap[r.id].callbacks / statsMap[r.id].total) * 100)
        : null,
    }))

    return NextResponse.json({ resumes: resumesWithStats })

  } catch (err) {
    console.error('[resumes GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Verify ownership before deleting
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('id, user_id, file_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Delete file from storage bucket if path exists
    if (resume.file_url) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([resume.file_url])

      if (storageError) {
        // Log but don't fail — DB record should still be deleted
        console.warn('[resumes DELETE] storage delete failed:', storageError.message)
      }
    }

    // Delete DB record
    const { error: dbError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[resumes DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}