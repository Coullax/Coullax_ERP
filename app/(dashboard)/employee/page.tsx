import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmployeeDashboardClient } from './employee-dashboard-client'

export default async function EmployeeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get employee data
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get today's attendance
  const today = new Date().toISOString().split('T')[0]
  const { data: todayAttendance } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', user.id)
    .eq('date', today)
    .single()

  // Get this month's stats
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: monthAttendance } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', user.id)
    .gte('date', `${currentMonth}-01`)

  // Get recent requests
  const { data: recentRequests } = await supabase
    .from('requests')
    .select('*')
    .eq('employee_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(5)

  // Check for covering requests awaiting proof submission
  const { data: awaitingProofRequests } = await supabase
    .from('requests')
    .select('id')
    .eq('employee_id', user.id)
    .eq('request_type', 'covering')
    .eq('status', 'awaiting_proof_submission')

  const attendanceStats = {
    present: monthAttendance?.filter(a => a.status === 'present').length || 0,
    absent: monthAttendance?.filter(a => a.status === 'absent').length || 0,
    leave: monthAttendance?.filter(a => a.status === 'leave').length || 0,
  }

  return (
    <EmployeeDashboardClient
      profile={profile}
      employee={employee}
      todayAttendance={todayAttendance}
      attendanceStats={attendanceStats}
      recentRequests={recentRequests || []}
      hasAwaitingProofSubmission={(awaitingProofRequests?.length || 0) > 0}
    />
  )
}
