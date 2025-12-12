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
            await adminMarkAttendance(record.employeeId, record.date, {
                check_in: record.checkIn || undefined,
                check_out: record.checkOut || undefined,
                status: record.status,
                notes: record.notes || undefined,
            })
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
