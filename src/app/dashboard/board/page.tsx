import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KanbanBoard from '@/components/board/KanbanBoard'
import OnboardingWrapper from '@/components/board/OnboardingWrapper'

export default async function BoardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const activeBoard = boards?.[0] ?? null

  const { data: applications } = activeBoard
    ? await supabase
        .from('applications')
        .select('*, resume:resumes(id, label)')
        .eq('board_id', activeBoard.id)
        .order('position', { ascending: true })
    : { data: [] }

    const showOnboarding = profile?.onboarding_completed === false

  // Show onboarding if not completed
  if (showOnboarding) {
    return (
      <OnboardingWrapper
        userId={user.id}
        initialApplications={applications ?? []}
        boards={boards ?? []}
        activeBoard={activeBoard}
        profile={profile}
      />
    )
  }

  return (
    <KanbanBoard
      initialApplications={applications ?? []}
      boards={boards ?? []}
      activeBoard={activeBoard}
      profile={profile}
    />
  )
}