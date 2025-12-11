import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminAttendanceClient } from './admin-attendance-client'
import {
  getAttendanceSummaryByDate,
  getEmployeesAttendanceByDate,
  getEmployeesOnLeaveByDate,
  getMonthAttendanceData,
} from '@/app/actions/admin-attendance-actions'

export default async function AdminAttendancePage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Get today's date
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Fetch initial data for today
  const [summary, attendanceData, leaveData, monthData] = await Promise.all([
    getAttendanceSummaryByDate(todayStr),
    getEmployeesAttendanceByDate(todayStr),
    getEmployeesOnLeaveByDate(todayStr),
    getMonthAttendanceData(today.getFullYear(), today.getMonth()),
  ])

  return (
    <AdminAttendanceClient
      initialAttendanceData={attendanceData}
      initialLeaveData={leaveData}
      initialSummary={summary}
      initialMonthData={monthData}
    />
  )
}
