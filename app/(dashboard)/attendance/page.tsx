import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AttendancePageClient } from './attendance-client'
import { getAttendanceLogs, getAttendanceSummary, getUserLeaveRequests } from '@/app/actions/attendance-actions'

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const currentMonth = new Date().toISOString().slice(0, 7)

  const [logs, summary, leaves] = await Promise.all([
    getAttendanceLogs(user.id, currentMonth),
    getAttendanceSummary(user.id, currentMonth),
    getUserLeaveRequests(user.id, currentMonth),
  ])

  return (
    <AttendancePageClient
      userId={user.id}
      logs={logs}
      summary={summary}
      leaves={leaves}
    />
  )
}
