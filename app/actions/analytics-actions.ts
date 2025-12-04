'use server'

import { createClient } from '@/lib/supabase/server'

export async function getAnalytics() {
  const supabase = await createClient()
  const currentMonth = new Date().toISOString().slice(0, 7)

  // Get total employees count
  const { count: totalEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })

  // Get attendance stats for current month
  const { data: attendanceLogs } = await supabase
    .from('attendance_logs')
    .select('*')
    .gte('date', `${currentMonth}-01`)

  // Get leave requests stats
  const { data: leaveRequests } = await supabase
    .from('requests')
    .select('*, leave_requests(*)')
    .eq('request_type', 'leave')
    .gte('submitted_at', `${currentMonth}-01`)

  // Get all requests by status
  const { data: allRequests } = await supabase
    .from('requests')
    .select('status, request_type')
    .gte('submitted_at', `${currentMonth}-01`)

  // Calculate attendance stats
  const attendanceStats = {
    present: attendanceLogs?.filter(log => log.status === 'present').length || 0,
    absent: attendanceLogs?.filter(log => log.status === 'absent').length || 0,
    leave: attendanceLogs?.filter(log => log.status === 'leave').length || 0,
    halfDay: attendanceLogs?.filter(log => log.status === 'half_day').length || 0,
  }

  // Calculate leave stats
  const leaveStats = {
    pending: leaveRequests?.filter(r => r.status === 'pending').length || 0,
    approved: leaveRequests?.filter(r => r.status === 'approved').length || 0,
    rejected: leaveRequests?.filter(r => r.status === 'rejected').length || 0,
  }

  // Calculate request stats by type
  const requestsByType = allRequests?.reduce((acc: any, req) => {
    acc[req.request_type] = (acc[req.request_type] || 0) + 1
    return acc
  }, {}) || {}

  // Calculate request stats by status
  const requestsByStatus = {
    pending: allRequests?.filter(r => r.status === 'pending').length || 0,
    approved: allRequests?.filter(r => r.status === 'approved').length || 0,
    rejected: allRequests?.filter(r => r.status === 'rejected').length || 0,
  }

  // Get departments with employee count
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')

  const departmentStats = await Promise.all(
    (departments || []).map(async (dept) => {
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', dept.id)
      
      return {
        name: dept.name,
        count: count || 0,
      }
    })
  )

  return {
    totalEmployees: totalEmployees || 0,
    attendanceStats,
    leaveStats,
    requestsByType,
    requestsByStatus,
    departmentStats,
    currentMonth,
  }
}
