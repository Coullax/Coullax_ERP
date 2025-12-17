import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamMembersClient } from './team-members-client'
import { getTeamsAndMembers } from '@/app/actions/employee-actions'

export default async function TeamMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is team lead
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'TeamLead') {
    redirect('/')
  }

  // Fetch teams and their members
  const teams = await getTeamsAndMembers(user.id)

  return (
    <TeamMembersClient
      teams={teams}
      teamLeadId={user.id}
    />
  )
}
