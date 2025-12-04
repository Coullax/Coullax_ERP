import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmployeesPageClient } from './employees-client'
import {
  getAllEmployees,
  getDepartments,
  getDesignations,
} from '@/app/actions/employee-actions'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    redirect('/')
  }

  const [employees, departments, designations] = await Promise.all([
    getAllEmployees(),
    getDepartments(),
    getDesignations(),
  ])

  return (
    <EmployeesPageClient
      employees={employees}
      departments={departments}
      designations={designations}
      currentUserId={user.id}
    />
  )
}
