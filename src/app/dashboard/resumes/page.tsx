import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResumesClient from './ResumesClient'

export default async function ResumesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return <ResumesClient profile={profile} />
}