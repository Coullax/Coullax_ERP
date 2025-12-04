import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfilePageClient } from './profile-client'
import { getEmployeeProfile } from '@/app/actions/profile-actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile and employee data
  const { profile, employee } = await getEmployeeProfile(user.id)

  return <ProfilePageClient profile={profile} employee={employee} />
}
