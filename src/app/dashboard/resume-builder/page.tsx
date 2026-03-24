import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResumeBuilderClient from './ResumeBuilderClient'

export default async function ResumeBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ResumeBuilderClient />
}