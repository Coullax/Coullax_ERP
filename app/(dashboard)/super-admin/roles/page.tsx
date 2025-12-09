import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRoles } from '@/app/actions/role-actions'
import { getPermissions, seedPermissions } from '@/app/actions/permission-actions'
import { RolesPageClient } from './roles-client'

export const metadata = {
  title: 'Roles & Permissions | Super Admin',
  description: 'Manage system roles and permissions',
}

export default async function RolesPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard')
  }

  // Seed permissions if needed
  try {
    await seedPermissions()
  } catch (error) {
    console.error('Failed to seed permissions:', error)
  }

  // Fetch data
  const [roles, permissionsData, usersData] = await Promise.all([
    getRoles(),
    getPermissions(),
    supabase.from('profiles').select('id, full_name, email, avatar_url, role').order('full_name'),
  ])

  const users = usersData.data || []
  const { permissions, grouped } = permissionsData

  return (
    <RolesPageClient
      roles={roles}
      permissions={permissions}
      groupedPermissions={grouped}
      users={users}
    />
  )
}
