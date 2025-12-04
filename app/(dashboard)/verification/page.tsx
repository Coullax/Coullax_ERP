import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VerificationPageClient } from './verification-client'
import { getEmployeeDocuments, getBankDetails } from '@/app/actions/verification-actions'

export default async function VerificationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [documents, bankDetails] = await Promise.all([
    getEmployeeDocuments(user.id),
    getBankDetails(user.id),
  ])

  return (
    <VerificationPageClient
      userId={user.id}
      documents={documents}
      bankDetails={bankDetails}
    />
  )
}
