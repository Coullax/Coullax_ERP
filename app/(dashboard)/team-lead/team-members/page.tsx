import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamMembersClient } from './team-members-client'
import { getTeamsAndMembers } from '@/app/actions/employee-actions'

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'

export default async function TeamMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is a department head (instead of checking profile role)
  const { data: departments } = await supabase
    .from('departments')
    .select('id')
    .eq('head_id', user.id)
    .limit(1)

  if (!departments || departments.length === 0) {
    console.log('User is not a department head')
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
