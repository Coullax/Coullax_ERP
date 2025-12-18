import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyTeamClient } from './client'
import { getTeamsAndMembers } from '@/app/actions/employee-actions'

export default async function MyTeamPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch teams and their members for current user
    const teams = await getTeamsAndMembers(user.id)

    return (
        <MyTeamClient
            teams={teams}
            currentUserId={user.id}
        />
    )
}
