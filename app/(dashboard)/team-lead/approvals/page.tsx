import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApprovalsPageClient } from './approvals-client'
import { getAllDepartmentRequests } from '@/app/actions/request-actions'

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
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
    redirect('/')
  }

  // Get ALL requests from team members (not just pending)
  const requests = await getAllDepartmentRequests(user.id)

  return <ApprovalsPageClient requests={requests} reviewerId={user.id} />
}
