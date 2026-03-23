import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Create user profile row if first login
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata.full_name ?? null,
          avatar_url: user.user_metadata.avatar_url ?? null,
          plan: 'free',
        }, { onConflict: 'id' })
      }

      return NextResponse.redirect(`${origin}/dashboard/board`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}