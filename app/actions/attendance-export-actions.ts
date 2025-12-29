'use server'

import { createClient } from '@/lib/supabase/server'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns'

interface DailyAttendanceRecord {
    date: string
    checkIn: string | null
    checkOut: string | null
    workingHours: number
    status: string
    leaveType?: string
    notes?: string
}

interface AttendanceExportData {
    employeeId: string
    employeeName: string
    employeeNumber: string
    month: number
    year: number
    dailyRecords: DailyAttendanceRecord[]
    summary: {
        totalLeaves: number
        totalWorkingHours: number
        coveringLeavesCount: number
        totalCoveringHours: number
    }
}

// Calculate working hours between two time strings
function calculateWorkingHours(checkIn: string | null, checkOut: string | null): number {
    if (!checkIn || !checkOut) return 0

    const checkInDate = new Date(`1970-01-01T${checkIn}`)
    const checkOutDate = new Date(`1970-01-01T${checkOut}`)

    const diffMs = checkOutDate.getTime() - checkInDate.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    return Math.max(0, diffHours)
}

// Get attendance data for a single employee for a specific month
export async function getEmployeeAttendanceForMonth(
    employeeId: string,
    year: number,
    month: number
): Promise<AttendanceExportData> {
    const supabase = await createClient()

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
      id,
      employee_id,
      profile:profiles!employees_id_fkey(full_name)
    `)
        .eq('id', employeeId)
        .single()

    if (employeeError) throw employeeError
    if (!employee) throw new Error('Employee not found')

    const startDate = startOfMonth(new Date(year, month, 1))
    const endDate = endOfMonth(new Date(year, month, 1))
    const startDateStr = format(startDate, 'yyyy-MM-dd')
    const endDateStr = format(endDate, 'yyyy-MM-dd')

    // Get attendance logs for the month
    const { data: attendanceLogs, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true })

    if (attendanceError) throw attendanceError

    // Get approved leave requests for the month
    const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select(`
      *,
      request:requests!leave_requests_request_id_fkey(status)
    `)
        .eq('employee_id', employeeId)
        .eq('request.status', 'approved')
        .or(`start_date.lte.${endDateStr},end_date.gte.${startDateStr}`)

    if (leaveError) throw leaveError

    // Get covering hours data
    const { data: coveringHours, error: coveringError } = await supabase
        .from('covering_hours')
        .select('hours_to_cover')
        .eq('employee_id', employeeId)
        .single()

    if (coveringError && coveringError.code !== 'PGRST116') {
        console.error('Error fetching covering hours:', coveringError)
    }

    // Get approved covering requests for the month
    const { data: coveringRequests, error: coveringRequestsError } = await supabase
        .from('covering_requests')
        .select(`
      *,
      request:requests!covering_requests_request_id_fkey(status)
    `)
        .eq('employee_id', employeeId)
        .eq('request.status', 'approved')
        .gte('covering_date', startDateStr)
        .lte('covering_date', endDateStr)

    if (coveringRequestsError) throw coveringRequestsError

    // Create a map of dates to attendance/leave data
    const dateMap = new Map<string, DailyAttendanceRecord>()

    // Add attendance logs
    attendanceLogs?.forEach(log => {
        const workingHours = calculateWorkingHours(log.check_in, log.check_out)
        dateMap.set(log.date, {
            date: log.date,
            checkIn: log.check_in,
            checkOut: log.check_out,
            workingHours,
            status: log.status,
            notes: log.notes,
        })
    })

    // Add leave requests
    leaveRequests?.forEach(leave => {
        const leaveStart = parseISO(leave.start_date)
        const leaveEnd = parseISO(leave.end_date)
        const leaveDays = eachDayOfInterval({ start: leaveStart, end: leaveEnd })

        leaveDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            if (dateStr >= startDateStr && dateStr <= endDateStr) {
                dateMap.set(dateStr, {
                    date: dateStr,
                    checkIn: null,
                    checkOut: null,
                    workingHours: 0,
                    status: 'leave',
                    leaveType: leave.leave_type,
                    notes: leave.reason,
                })
            }
        })
    })

    // Generate daily records for all days in the month
    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    const dailyRecords: DailyAttendanceRecord[] = allDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        return dateMap.get(dateStr) || {
            date: dateStr,
            checkIn: null,
            checkOut: null,
            workingHours: 0,
            status: 'absent',
        }
    })

    // Calculate summary
    const totalLeaves = dailyRecords.filter(r => r.status === 'leave').length
    const totalWorkingHours = dailyRecords.reduce((sum, r) => sum + r.workingHours, 0)

    // Calculate covering hours from approved covering requests
    let totalCoveringHours = 0
    coveringRequests?.forEach(req => {
        const hours = calculateWorkingHours(req.start_time, req.end_time)
        totalCoveringHours += hours
    })

    return {
        employeeId: employee.id,
        employeeName: (employee.profile as any)?.full_name || 'Unknown',
        employeeNumber: employee.employee_id,
        month,
        year,
        dailyRecords,
        summary: {
            totalLeaves,
            totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
            coveringLeavesCount: coveringRequests?.length || 0,
            totalCoveringHours: Math.round(totalCoveringHours * 100) / 100,
        },
    }
}

// Get attendance data for all employees for a specific month
export async function getAllEmployeesAttendanceForMonth(
    year: number,
    month: number
): Promise<AttendanceExportData[]> {
    const supabase = await createClient()

    // Get all active employees
    const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select(`
      id,
      employee_id,
      profile:profiles!employees_id_fkey(full_name)
    `)
        .order('employee_id', { ascending: true })

    if (employeesError) throw employeesError
    if (!employees || employees.length === 0) return []

    // Fetch attendance data for each employee
    const attendanceDataPromises = employees.map(emp =>
        getEmployeeAttendanceForMonth(emp.id, year, month)
    )

    const attendanceData = await Promise.all(attendanceDataPromises)
    return attendanceData
}
