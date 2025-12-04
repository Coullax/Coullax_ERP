import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RequestsPageClient } from './requests-client'
import { getMyRequests } from '@/app/actions/request-actions'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const requests = await getMyRequests(user.id)

  return <RequestsPageClient requests={requests} userId={user.id} />
}
