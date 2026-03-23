import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'resume'

// ── PDF text extraction helper ────────────────────────────────────────────────
// pdf-parse doesn't have a .default export in its ESM build.
// We require() it via createRequire to get the CommonJS version safely.
async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    // Use createRequire to load the CJS version of pdf-parse
    const { createRequire } = await import('module')
    const require    = createRequire(import.meta.url)
    const pdfParse   = require('pdf-parse')
    const parsed     = await pdfParse(buffer)
    return parsed.text?.slice(0, 8000) ?? null
  } catch (e) {
    console.warn('[upload] PDF text extraction failed:', e)
    return null
  }
}

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

    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
    const filePath = `${user.id}/${Date.now()}-${safeName}`
    const arrayBuf = await file.arrayBuffer()
    const buffer   = Buffer.from(arrayBuf)

    // Upload to Supabase Storage
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

    // Extract text — non-fatal if it fails
    const resumeText = await extractPdfText(buffer)

    // Save to DB
    const { data: resume, error: dbError } = await supabase
      .from('resumes')
      .insert({
        user_id:     user.id,
        label:       label.trim(),
        file_url:    filePath,
        resume_text: resumeText,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[upload] db error:', dbError)
      await supabase.storage.from(BUCKET).remove([filePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ resume }, { status: 201 })

  } catch (err) {
    console.error('[resumes/upload] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}