import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: boards } = await supabase
    .from('boards')
    .select('id, name')
    .eq('user_id', user.id)

  const activeBoardId = boards?.[0]?.id ?? null

  return <AnalyticsClient activeBoardId={activeBoardId} />
}