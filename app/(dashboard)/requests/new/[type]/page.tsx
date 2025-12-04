import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RequestForm } from '@/components/requests/request-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewRequestPage({ params }: { params: { type: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <Link
        href="/requests"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </Link>

      <RequestForm employeeId={user.id} requestType={params.type} />
    </div>
  )
}
