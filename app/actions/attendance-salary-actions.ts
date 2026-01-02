'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =====================================================
// Types
// =====================================================

export type AttendanceSalary = {
    id: string
    employee_id: string
    month: string
    absent_days: number
    half_days: number
    leave_days: number
    poya_days: number
    holiday_days: number
    unpaid_leave_days: number
    total_working_days: number
    calculated_amount: number
    notes: string | null
    created_at: string
    updated_at: string
}

export type EmployeeWithAttendance = {
    id: string
    employee_id: string
    full_name: string
    email: string
    base_salary: number | null
    attendance_stats: {
        absent: number
        half_day: number
        leave: number
        poya: number
        holiday: number
        unpaid_leave: number
        total: number
    }
}

// =====================================================
// Employee Data Actions
// =====================================================

export async function getEmployeesForAttendanceSalary() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('employees')
            .select(`
        id,
        employee_id,
        profile:profiles!employees_id_fkey(
          full_name,
          email
        ),
        salary:salaries(base_amount)
      `)
            .eq('is_active', true)
            .order('employee_id', { ascending: true })

        if (error) throw error

        const employees = data.map(emp => ({
            id: emp.id,
            employee_id: emp.employee_id,
            full_name: (emp.profile as any)?.full_name || 'N/A',
            email: (emp.profile as any)?.email || 'N/A',
            base_salary: (emp.salary as any)?.base_amount || null,
        }))

        return { success: true, data: employees }
    } catch (error: any) {
        console.error('Error fetching employees for attendance salary:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// =====================================================
// Attendance Calculation Actions
// =====================================================

export async function calculateAttendanceStats(employeeId: string, month: string) {
    try {
        const supabase = await createClient()

        // Parse month to get start and end dates
        const monthDate = new Date(month + '-01')
        const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)

        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        // Get attendance logs for the month
        const { data: logs, error: logsError } = await supabase
            .from('attendance_logs')
            .select('status')
            .eq('employee_id', employeeId)
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (logsError) throw logsError

        // Calculate stats from attendance logs
        const stats = {
            present: logs?.filter(l => l.status === 'present').length || 0,
            absent: logs?.filter(l => l.status === 'absent').length || 0,
            half_day: logs?.filter(l => l.status === 'half_day').length || 0,
            leave: logs?.filter(l => l.status === 'leave').length || 0,
            poya: logs?.filter(l => l.status === 'poya').length || 0,
            holiday: logs?.filter(l => l.status === 'holiday').length || 0,
            total: logs?.length || 0,
        }

        // Calculate unpaid leaves from leave_requests
        // Query the leave_requests table directly and join with requests
        // We need to find leaves that overlap with the selected month:
        // - Leaves that start during the month
        // - Leaves that end during the month
        // - Leaves that span the entire month
        const { data: unpaidLeaves, error: unpaidError } = await supabase
            .from('leave_requests')
            .select(`
        total_days,
        leave_type,
        start_date,
        end_date,
        request:requests!inner(
          employee_id,
          request_type,
          status
        )
      `)
            .eq('request.employee_id', employeeId)
            .eq('request.request_type', 'leave')
            .eq('request.status', 'approved')
            .eq('leave_type', 'unpaid')
            .lte('start_date', endDateStr)  // Leave starts before or during the month
            .gte('end_date', startDateStr)  // Leave ends during or after the month

        if (unpaidError) throw unpaidError

        // Count unpaid leave days
        const unpaidLeaveDays = unpaidLeaves
            ?.reduce((sum: number, leave: any) => sum + (parseFloat(leave.total_days) || 0), 0) || 0

        return {
            success: true,
            data: {
                ...stats,
                unpaid_leave: unpaidLeaveDays,
            },
        }
    } catch (error: any) {
        console.error('Error calculating attendance stats:', error)
        return { success: false, error: error.message, data: null }
    }
}

// =====================================================
// CRUD Operations for attendance_salary table
// =====================================================

export async function createAttendanceSalary(data: {
    employee_id: string
    month: string
    absent_days: number
    half_days: number
    leave_days: number
    poya_days: number
    holiday_days: number
    unpaid_leave_days: number
    total_working_days: number
    calculated_amount: number
    notes?: string
}) {
    try {
        const supabase = await createClient()

        const { data: record, error } = await supabase
            .from('attendance_salary')
            .insert([data])
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/salary/attendance-calculation')
        return { success: true, data: record }
    } catch (error: any) {
        console.error('Error creating attendance salary record:', error)
        return { success: false, error: error.message }
    }
}

export async function updateAttendanceSalary(
    id: string,
    data: {
        absent_days?: number
        half_days?: number
        leave_days?: number
        poya_days?: number
        holiday_days?: number
        unpaid_leave_days?: number
        total_working_days?: number
        calculated_amount?: number
        notes?: string
    }
) {
    try {
        const supabase = await createClient()

        const { data: record, error } = await supabase
            .from('attendance_salary')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/admin/salary/attendance-calculation')
        return { success: true, data: record }
    } catch (error: any) {
        console.error('Error updating attendance salary record:', error)
        return { success: false, error: error.message }
    }
}

export async function getAttendanceSalaryByMonth(month: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('attendance_salary')
            .select(`
        *,
        employee:employees!attendance_salary_employee_id_fkey(
          employee_id,
          profile:profiles!employees_id_fkey(full_name, email)
        )
      `)
            .eq('month', month + '-01')
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data: data as AttendanceSalary[] }
    } catch (error: any) {
        console.error('Error fetching attendance salary by month:', error)
        return { success: false, error: error.message, data: [] }
    }
}

export async function getEmployeeAttendanceSalary(employeeId: string, month: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('attendance_salary')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('month', month + '-01')
            .maybeSingle()

        if (error) throw error

        return { success: true, data: data as AttendanceSalary | null }
    } catch (error: any) {
        console.error('Error fetching employee attendance salary:', error)
        return { success: false, error: error.message, data: null }
    }
}

export async function deleteAttendanceSalary(id: string) {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('attendance_salary')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/admin/salary/attendance-calculation')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting attendance salary record:', error)
        return { success: false, error: error.message }
    }
}
