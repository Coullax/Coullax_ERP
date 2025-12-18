import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApprovalsPageClient } from './approvals-client'
import { getAllRequests } from '@/app/actions/request-actions'

export default async function ApprovalsPage() {
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

  if (profile?.role !== 'TeamLead') {
    redirect('/')
  }

  const requests = await getAllRequests()

  return <ApprovalsPageClient requests={requests} reviewerId={user.id} />
}
