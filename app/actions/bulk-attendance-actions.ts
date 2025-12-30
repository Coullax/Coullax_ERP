'use server'

import { createClient } from '@/lib/supabase/server'
import { adminMarkAttendance } from './attendance-actions'
import { revalidatePath } from 'next/cache'

export interface BulkAttendanceRecord {
    employeeId: string
    date: string
    checkIn: string | null
    checkOut: string | null
    status: string
    notes?: string
    leaveDeduction?: {
        employeeId: string
        leaveType: string
        daysToDeduct: number
        shouldCancelLeave: boolean
    }
}

export interface BulkAttendanceResult {
    success: number
    failed: number
    errors: Array<{
        employeeId: string
        date: string
        error: string
    }>
}

/**
 * Find employee by their employee_id
 */
export async function findEmployeeByEmployeeId(employeeId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('employees')
        .select(`
      id,
      employee_id,
      profile:profiles!employees_id_fkey(
        full_name,
        email
      )
    `)
        .eq('employee_id', employeeId)
        .single()

    if (error) return null
    return data
}

/**
 * Validate and get employee IDs for bulk records
 */
export async function validateEmployeeIds(employeeIds: string[]) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('employees')
        .select('id, employee_no')
        .in('employee_no', employeeIds)

    if (error) throw error

    // Create a map of employee_id -> id
    const employeeMap = new Map<string, string>()
    data?.forEach(emp => {
        employeeMap.set(emp.employee_no, emp.id)
    })

    return employeeMap
}

/**
 * Check for leave conflicts - returns map of employeeId-date combinations that have approved leaves
 */
export async function checkLeaveConflicts(
    employeeIds: string[],
    dates: string[]
): Promise<Map<string, string>> {
    if (employeeIds.length === 0 || dates.length === 0) {
        return new Map()
    }

    const supabase = await createClient()
    const minDate = dates.reduce((a, b) => (a < b ? a : b))
    const maxDate = dates.reduce((a, b) => (a > b ? a : b))

    const { data, error } = await supabase
        .from('leave_requests')
        .select(`
            employee_id,
            start_date,
            end_date,
            leave_type,
            request:requests!leave_requests_request_id_fkey(status)
        `)
        .in('employee_id', employeeIds)
        .lte('start_date', maxDate)
        .gte('end_date', minDate)
        .eq('request.status', 'approved')

    if (error) {
        console.error('Error checking leave conflicts:', error)
        return new Map()
    }

    // Create a map of "employeeId-date" -> leave type
    const conflictMap = new Map<string, string>()

    data?.forEach(leave => {
        const startDate = new Date(leave.start_date)
        const endDate = new Date(leave.end_date)

        // Check each date in the leave range
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0]
            if (dates.includes(dateStr)) {
                const key = `${leave.employee_id}-${dateStr}`
                conflictMap.set(key, leave.leave_type)
            }
        }
    })

    return conflictMap
}

/**
 * Bulk mark attendance for multiple employees
 */
export async function bulkMarkAttendance(
    records: BulkAttendanceRecord[]
): Promise<BulkAttendanceResult> {
    const result: BulkAttendanceResult = {
        success: 0,
        failed: 0,
        errors: [],
    }

    // Process each record
    for (const record of records) {
        try {
            await adminMarkAttendance(
                record.employeeId,
                record.date,
                {
                    check_in: record.checkIn || undefined,
                    check_out: record.checkOut || undefined,
                    status: record.status,
                    notes: record.notes || undefined,
                },
                record.leaveDeduction
            )
            result.success++
        } catch (error: any) {
            result.failed++
            result.errors.push({
                employeeId: record.employeeId,
                date: record.date,
                error: error.message || 'Unknown error',
            })
        }
    }

    // Revalidate paths
    revalidatePath('/admin/attendance')

    return result
}
