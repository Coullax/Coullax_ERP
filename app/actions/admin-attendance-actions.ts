'use server'

import { createClient } from '@/lib/supabase/server'

// Get attendance summary for a specific date
export async function getAttendanceSummaryByDate(date: string) {
  const supabase = await createClient()

  // Get total attendance count
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance_logs')
    .select('id')
    .eq('date', date)

  if (attendanceError) throw attendanceError

  // Get total leaves count for the date
  const { data: leavesData, error: leavesError } = await supabase
    .from('leave_requests')
    .select(`
      id,
      request:requests!leave_requests_request_id_fkey(status)
    `)
    .lte('start_date', date)
    .gte('end_date', date)
    .eq('request.status', 'approved')

  if (leavesError) throw leavesError

  return {
    totalAttendance: attendanceData?.length || 0,
    totalLeaves: leavesData?.length || 0,
  }
}

// Get employees who marked attendance on a specific date
export async function getEmployeesAttendanceByDate(date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      employee:employees!attendance_logs_employee_id_fkey(
        id,
        employee_id,
        profile:profiles!employees_id_fkey(full_name)
      )
    `)
    .eq('date', date)
    .order('check_in', { ascending: true })

  if (error) throw error

  return data?.map(log => ({
    id: log.id,
    employee: {
      id: log.employee.id,
      employee_id: log.employee.employee_id,
      full_name: log.employee.profile?.full_name || 'Unknown',
    },
    check_in: log.check_in,
    check_out: log.check_out,
    status: log.status,
    notes: log.notes,
    date: log.date,
  })) || []
}

// Get employees on leave for a specific date
export async function getEmployeesOnLeaveByDate(date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      employee:employees!leave_requests_employee_id_fkey(
        id,
        employee_id,
        profile:profiles!employees_id_fkey(full_name)
      ),
      request:requests!leave_requests_request_id_fkey(
        id,
        status,
        reviewed_at,
        reviewed_by
      )
    `)
    .lte('start_date', date)
    .gte('end_date', date)
    .eq('request.status', 'approved')
    .order('start_date', { ascending: true })

  if (error) throw error

  return data?.map(leave => ({
    id: leave.id,
    employee: {
      id: leave.employee.id,
      employee_id: leave.employee.employee_id,
      full_name: leave.employee.profile?.full_name || 'Unknown',
    },
    leave_type: leave.leave_type,
    start_date: leave.start_date,
    end_date: leave.end_date,
    total_days: leave.total_days,
    reason: leave.reason,
    request_id: leave.request?.id,
  })) || []
}

// Get attendance data for the entire month (for calendar visualization)
export async function getMonthAttendanceData(year: number, month: number) {
  const supabase = await createClient()
  
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)
  
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Get attendance counts per day
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance_logs')
    .select('date')
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (attendanceError) throw attendanceError

  // Get leave counts per day
  const { data: leavesData, error: leavesError } = await supabase
    .from('leave_requests')
    .select(`
      start_date,
      end_date,
      request:requests!leave_requests_request_id_fkey(status)
    `)
    .eq('request.status', 'approved')
    .or(`start_date.lte.${endDateStr},end_date.gte.${startDateStr}`)

  if (leavesError) throw leavesError

  // Count attendance by date
  const attendanceByDate: Record<string, number> = {}
  attendanceData?.forEach(log => {
    attendanceByDate[log.date] = (attendanceByDate[log.date] || 0) + 1
  })

  // Count leaves by date
  const leavesByDate: Record<string, number> = {}
  leavesData?.forEach(leave => {
    const start = new Date(leave.start_date)
    const end = new Date(leave.end_date)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      if (dateStr >= startDateStr && dateStr <= endDateStr) {
        leavesByDate[dateStr] = (leavesByDate[dateStr] || 0) + 1
      }
    }
  })

  return {
    attendanceByDate,
    leavesByDate,
  }
}
