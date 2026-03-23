import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ─── PATCH /api/applications/[id] ────────────────────────────────────────────
// Updates any field on an application — status, resume_id, notes, etc.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body   = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify this application belongs to the requesting user (via board ownership)
    const { data: existing, error: fetchError } = await supabase
      .from('applications')
      .select('id, board_id, boards!inner(user_id)')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // @ts-ignore — Supabase join typing
    if (existing.boards?.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If updating resume_id, verify the resume belongs to this user
    if (body.resume_id) {
      const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('id')
        .eq('id', body.resume_id)
        .eq('user_id', user.id)
        .single()

      if (resumeError || !resume) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
      }
    }

    // Remove any fields that shouldn't be updated directly
    const { id: _id, board_id: _board, created_at: _ca, ...safeBody } = body

    // Perform the update
    const { data: updated, error: updateError } = await supabase
      .from('applications')
      .update({
        ...safeBody,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, resume:resumes(id, label)')
      .single()

    if (updateError) {
      console.error('[PATCH /api/applications/[id]]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ application: updated })

  } catch (err) {
    console.error('[PATCH /api/applications/[id]] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/applications/[id] ───────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('applications')
      .select('id, boards!inner(user_id)')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // @ts-ignore
    if (existing.boards?.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[DELETE /api/applications/[id]] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/applications/[id] ──────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: application, error } = await supabase
      .from('applications')
      .select('*, resume:resumes(id, label), boards!inner(user_id)')
      .eq('id', id)
      .single()

    if (error || !application) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // @ts-ignore
    if (application.boards?.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ application })

  } catch (err) {
    console.error('[GET /api/applications/[id]] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}