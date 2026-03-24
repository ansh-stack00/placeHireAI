import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET = 'resume'

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const { createRequire } = await import('module')
    const require   = createRequire(import.meta.url)
    const pdfParse  = require('pdf-parse-debugging-disabled')
    const parsed    = await pdfParse(buffer)
    return parsed.text?.slice(0, 8000) ?? null
  } catch (e) {
    console.warn('[re-extract] PDF parse failed:', e)
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

    const { resume_id } = await req.json()
    if (!resume_id) {
      return NextResponse.json({ error: 'resume_id is required' }, { status: 400 })
    }

    // Fetch resume and verify ownership
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('id, user_id, file_url, label')
      .eq('id', resume_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    if (!resume.file_url) {
      return NextResponse.json({ error: 'No file path saved for this resume' }, { status: 400 })
    }

    // Download the PDF from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(resume.file_url)

    if (downloadError || !fileData) {
      console.error('[re-extract] download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download PDF from storage. The file may have been deleted.' },
        { status: 500 }
      )
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    // Extract text
    const resumeText = await extractPdfText(buffer)

    if (!resumeText) {
      return NextResponse.json(
        { error: 'Could not extract text from this PDF. Try re-uploading the file.' },
        { status: 422 }
      )
    }

    // Save extracted text to DB
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ resume_text: resumeText })
      .eq('id', resume_id)

    if (updateError) {
      console.error('[re-extract] db update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success:      true,
      chars_extracted: resumeText.length,
      preview:      resumeText.slice(0, 100) + '...',
    })

  } catch (err) {
    console.error('[re-extract] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}