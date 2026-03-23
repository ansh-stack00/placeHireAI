import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const path   = searchParams.get('path')
    const bucket = searchParams.get('bucket') ?? 'resume' // default to 'resume'

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    // Security: the path must start with the requesting user's own ID
    // Path format: "user_id/timestamp-filename.pdf"
    const pathUserId = path.split('/')[0]
    if (pathUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate a signed URL valid for 60 seconds
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60)

    if (error || !data?.signedUrl) {
      console.error('[signed-url] error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Could not generate signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: data.signedUrl })

  } catch (err) {
    console.error('[signed-url] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}