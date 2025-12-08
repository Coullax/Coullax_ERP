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

  const summary = {
    present: data.filter(d => d.status === 'present').length,
    absent: data.filter(d => d.status === 'absent').length,
    leave: data.filter(d => d.status === 'leave').length,
    halfDay: data.filter(d => d.status === 'half_day').length,
    total: data.length,
  }

  return summary
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
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('attendance_logs')
    .upsert({
      employee_id: employeeId,
      date,
      ...data,
    })

  if (error) throw error

  revalidatePath('/attendance')
  revalidatePath('/admin/attendance')
  return { success: true }
}
