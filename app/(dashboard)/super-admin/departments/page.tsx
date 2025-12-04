import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DepartmentsPageClient } from './departments-client'
import { getDepartmentsData, getAllUsers } from '@/app/actions/department-actions'

export default async function DepartmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    redirect('/')
  }

  const [departments, users] = await Promise.all([
    getDepartmentsData(),
    getAllUsers(),
  ])

  return <DepartmentsPageClient departments={departments} users={users} />
}
