import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Correct bucket name
const BUCKET = 'resume'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Free plan: max 2 resumes
    const { data: profile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profile?.plan === 'free') {
      const { count } = await supabase
        .from('resumes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count ?? 0) >= 2) {
        return NextResponse.json(
          { error: 'Free plan allows 2 resumes. Upgrade to Pro for unlimited.' },
          { status: 403 }
        )
      }
    }

    const formData = await req.formData()
    const file     = formData.get('file')  as File   | null
    const label    = formData.get('label') as string | null

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (!label?.trim()) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
    }

    // Build storage path: user_id/timestamp-filename.pdf
    const safeName  = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
    const filePath  = `${user.id}/${Date.now()}-${safeName}`
    const arrayBuf  = await file.arrayBuffer()
    const buffer    = Buffer.from(arrayBuf)

    // Upload to Supabase Storage bucket "resume"
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert:      false,
      })

    if (uploadError) {
      console.error('[upload] storage error:', uploadError)
      return NextResponse.json(
        { error: `Storage error: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Extract text from PDF for AI scoring
    let resumeText: string | null = null
    try {
      const pdfParse = (await import('pdf-parse')).default
      const parsed   = await pdfParse(buffer)
      resumeText     = parsed.text?.slice(0, 8000) ?? null
    } catch (e) {
      // Non-fatal — resume still saved without text
      console.warn('[upload] PDF text extraction failed:', e)
    }

    // Save to resumes table — store the file PATH (not a public URL)
    // We use signed URLs at read time, so we only need the path
    const { data: resume, error: dbError } = await supabase
      .from('resumes')
      .insert({
        user_id:     user.id,
        label:       label.trim(),
        file_url:    filePath,    // e.g. "abc-123/1700000000-resume.pdf"
        resume_text: resumeText,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[upload] db error:', dbError)
      // Clean up the uploaded file if DB insert failed
      await supabase.storage.from(BUCKET).remove([filePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ resume }, { status: 201 })

  } catch (err) {
    console.error('[resumes/upload] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}