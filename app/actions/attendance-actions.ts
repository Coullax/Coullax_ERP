'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Get attendance logs for employee
export async function getAttendanceLogs(employeeId: string, month?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)

  if (month) {
    const startDate = new Date(month)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
    query = query
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
  }

  const { data, error } = await query.order('date', { ascending: false })

  if (error) throw error
  return data
}

// Mark attendance (check-in/check-out)
export async function markAttendance(
  employeeId: string,
  type: 'check_in' | 'check_out'
) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentTime = now.toTimeString().split(' ')[0] // HH:MM:SS format

  // Check if attendance exists for today
  const { data: existing } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .single()

  if (type === 'check_in') {
    if (existing) {
      throw new Error('Already checked in today')
    }

    const { error } = await supabase.from('attendance_logs').insert({
      employee_id: employeeId,
      date: today,
      check_in: currentTime,
      status: 'present',
    })

    if (error) throw error
  } else {
    if (!existing) {
      throw new Error('No check-in found for today')
    }

    if (existing.check_out) {
      throw new Error('Already checked out today')
    }

    const { error } = await supabase
      .from('attendance_logs')
      .update({ check_out: currentTime })
      .eq('id', existing.id)

    if (error) throw error
  }

  revalidatePath('/attendance')
  return { success: true }
}

// Get attendance summary
export async function getAttendanceSummary(employeeId: string, month: string) {
  const supabase = await createClient()

  const startDate = new Date(month)
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('status')
    .eq('employee_id', employeeId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  if (error) throw error

  // Get covering hours balance
  const { data: coveringData } = await supabase
    .from('covering_hours')
    .select('hours_to_cover')
    .eq('employee_id', employeeId)
    .maybeSingle()

  const summary = {
    present: data.filter(d => d.status === 'present').length,
    absent: data.filter(d => d.status === 'absent').length,
    leave: data.filter(d => d.status === 'leave').length,
    halfDay: data.filter(d => d.status === 'half_day').length,
    covering: coveringData?.hours_to_cover || 0,
    total: data.length,
  }

  return summary
}

// Get user leave requests for a given month
export async function getUserLeaveRequests(employeeId: string, month?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      request:requests!leave_requests_request_id_fkey(
        id,
        status,
        submitted_at,
        reviewed_at,
        reviewed_by,
        review_notes
      )
    `)
    .eq('employee_id', employeeId)

  if (month) {
    const startDate = new Date(month)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

    // Filter leaves that overlap with the month
    query = query
      .lte('start_date', endDate.toISOString().split('T')[0])
      .gte('end_date', startDate.toISOString().split('T')[0])
  }

  const { data, error } = await query.order('start_date', { ascending: false })

  if (error) throw error
  return data
}

// Get all employees attendance (Admin)
export async function getAllAttendance(date: string) {
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
  return data
}

// Admin: Mark attendance for employee
export async function adminMarkAttendance(
  employeeId: string,
  date: string,
  data: {
    check_in?: string
    check_out?: string
    status: string
    notes?: string
  },
  leaveDeduction?: {
    employeeId: string
    leaveType: string
    daysToDeduct: number
    shouldCancelLeave: boolean
  }
) {
  const supabase = await createClient()

  // Handle leave deduction if provided
  if (leaveDeduction && leaveDeduction.daysToDeduct > 0) {
    console.log('Processing leave deduction:', leaveDeduction)

    // Find the leave request for this employee on this date
    const { data: leaveRequests, error: leaveError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        start_date,
        end_date,
        leave_type,
        total_days,
        request_id
      `)
      .eq('employee_id', employeeId)
      .lte('start_date', date)
      .gte('end_date', date)
      .limit(1)

    if (leaveError) {
      console.error('Error fetching leave request:', leaveError)
      throw new Error('Failed to fetch leave request')
    }

    if (leaveRequests && leaveRequests.length > 0) {
      const leaveRequest = leaveRequests[0]
      console.log('Found leave request:', leaveRequest)

      if (!leaveRequest.request_id) {
        console.error('Leave request has no request_id')
        throw new Error('Invalid leave request data')
      }

      // Verify the request is approved
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select('id, status')
        .eq('id', leaveRequest.request_id)
        .single()

      console.log('Request data:', requestData, 'Error:', requestError)

      if (requestError || !requestData || requestData.status !== 'approved') {
        console.log('Leave request not approved or not found, skipping deduction')
      } else if (leaveDeduction.shouldCancelLeave) {
        console.log('Cancelling leave request:', requestData.id)

        // Cancel the leave request
        const { error: cancelError } = await supabase
          .from('requests')
          .update({ status: 'cancelled' })
          .eq('id', requestData.id)

        if (cancelError) {
          console.error('Error cancelling leave request:', cancelError)
          throw new Error('Failed to cancel leave request')
        }

        console.log('Leave request cancelled successfully')

        // Restore only the unused portion of leave days
        // If half_day (0.5 deduction), restore 0.5 days (keep 0.5 deducted)
        // If present (1 day deduction), restore 0 days (keep 1 day deducted)
        const daysToRestore = leaveRequest.total_days - leaveDeduction.daysToDeduct

        console.log('Days to restore:', daysToRestore, '(total:', leaveRequest.total_days, '- deduct:', leaveDeduction.daysToDeduct, ')')

        if (daysToRestore > 0) {
          const { data: leaveBalance, error: balanceError } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('leave_type', leaveRequest.leave_type)
            .single()

          console.log('Current leave balance:', leaveBalance)

          if (!balanceError && leaveBalance) {
            const newUsedDays = leaveBalance.used_days - daysToRestore
            const newRemainingDays = leaveBalance.remaining_days + daysToRestore

            console.log('Updating balance - used:', leaveBalance.used_days, '->', newUsedDays, ', remaining:', leaveBalance.remaining_days, '->', newRemainingDays)

            const { error: updateError } = await supabase
              .from('leave_balances')
              .update({
                used_days: newUsedDays,
                remaining_days: newRemainingDays
              })
              .eq('id', leaveBalance.id)

            if (updateError) {
              console.error('Error updating leave balance:', updateError)
            } else {
              console.log('Leave balance updated successfully')
            }
          }
        } else {
          console.log('No days to restore (employee worked full day)')
        }
      }
    } else {
      console.log('No leave request found for this date')
    }
  }

  // If admin is marking attendance as "leave" (retroactive leave), deduct from leave balance
  if (data.status === 'leave' && !leaveDeduction) {
    console.log('Admin marking attendance as leave - deducting from balance')

    // Get the month and year from the attendance date
    const attendanceDate = new Date(date)
    const month = attendanceDate.getMonth() + 1 // JavaScript months are 0-indexed
    const year = attendanceDate.getFullYear()

    console.log('Looking for leave balance for month:', month, 'year:', year)

    const { data: leaveBalance, error: balanceError } = await supabase
      .from('employee_leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('month', month)
      .eq('year', year)
      .single()

    if (!balanceError && leaveBalance) {
      console.log('Found leave balance:', leaveBalance)

      // Check if employee has enough leave balance
      if (leaveBalance.available_leaves >= 1) {
        const { error: updateError } = await supabase
          .from('employee_leave_balances')
          .update({
            used_leaves: Number(leaveBalance.used_leaves) + 1,
            available_leaves: Number(leaveBalance.available_leaves) - 1
          })
          .eq('id', leaveBalance.id)

        if (updateError) {
          console.error('Error deducting leave balance:', updateError)
        } else {
          console.log('Leave balance deducted: 1 day from month', month, 'year', year)
        }
      } else {
        console.warn('Insufficient leave balance for employee:', employeeId, 'month:', month, 'year:', year)
        // You might want to throw an error here or handle it differently
      }
    } else {
      console.error('Leave balance not found for employee:', employeeId, 'month:', month, 'year:', year, 'Error:', balanceError)
    }
  }

  // Mark attendance
  const { error } = await supabase
    .from('attendance_logs')
    .upsert(
      {
        employee_id: employeeId,
        date,
        ...data,
      },
      {
        onConflict: 'employee_id,date',
      }
    )

  if (error) throw error

  revalidatePath('/attendance')
  revalidatePath('/admin/attendance')
  return { success: true }
}
