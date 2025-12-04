import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VerificationsPageClient } from './verifications-client'
import {
  getAllDocumentsForVerification,
  getVerificationStats,
} from '@/app/actions/verification-actions'

export default async function VerificationsPage() {
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

  const [documents, stats] = await Promise.all([
    getAllDocumentsForVerification(),
    getVerificationStats(),
  ])

  return (
    <VerificationsPageClient
      documents={documents}
      stats={stats}
      reviewerId={user.id}
    />
  )
}
