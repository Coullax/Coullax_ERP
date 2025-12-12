import * as XLSX from 'xlsx'

export interface AttendanceRecord {
    personId: string
    name: string
    department: string
    position: string
    gender: string
    date: string
    dayOfWeek: string
    timetable: string
    checkIn: string | null
    checkOut: string | null
    status: string
    error?: string
}

export interface ParsedAttendanceData {
    records: AttendanceRecord[]
    errors: string[]
    totalRecords: number
}

/**
 * Parse attendance Excel file
 * Expected columns: Person ID, Name, Department, Position, Gender, Date, Day Of Week, Timetable, First-In, Last-Out
 */
export async function parseAttendanceExcel(file: File): Promise<ParsedAttendanceData> {
    const errors: string[] = []
    const records: AttendanceRecord[] = []

    try {
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
            throw new Error('Excel file is empty')
        }

        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row')
        }

        // Get headers
        const headers = jsonData[0].map((h: any) => String(h).trim())

        // Find column indices
        const colIndices = {
            personId: findColumnIndex(headers, ['Person ID', 'PersonID', 'Employee ID', 'No.']),
            name: findColumnIndex(headers, ['Name', 'Employee Name', 'Full Name']),
            department: findColumnIndex(headers, ['Department', 'Dept']),
            position: findColumnIndex(headers, ['Position', 'Designation', 'Role']),
            gender: findColumnIndex(headers, ['Gender', 'Sex']),
            date: findColumnIndex(headers, ['Date', 'Attendance Date']),
            dayOfWeek: findColumnIndex(headers, ['Day Of Week', 'Day', 'Weekday']),
            timetable: findColumnIndex(headers, ['Timetable', 'Schedule', 'Shift']),
            checkIn: findColumnIndex(headers, ['First-In', 'Check In', 'Check-In', 'CheckIn', 'In Time']),
            checkOut: findColumnIndex(headers, ['Last-Out', 'Check Out', 'Check-Out', 'CheckOut', 'Out Time']),
        }

        // Validate required columns
        const requiredColumns = ['personId', 'name', 'date']
        for (const col of requiredColumns) {
            if (colIndices[col as keyof typeof colIndices] === -1) {
                throw new Error(`Required column not found: ${col}. Headers found: ${headers.join(', ')}`)
            }
        }

        // Process data rows
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i]

            // Skip empty rows
            if (!row || row.length === 0 || !row[colIndices.personId]) {
                continue
            }

            try {
                const record: AttendanceRecord = {
                    personId: formatValue(row[colIndices.personId]),
                    name: formatValue(row[colIndices.name]),
                    department: formatValue(row[colIndices.department]),
                    position: formatValue(row[colIndices.position]),
                    gender: formatValue(row[colIndices.gender]),
                    date: formatDate(row[colIndices.date]),
                    dayOfWeek: formatValue(row[colIndices.dayOfWeek]),
                    timetable: formatValue(row[colIndices.timetable]),
                    checkIn: formatTime(row[colIndices.checkIn]),
                    checkOut: formatTime(row[colIndices.checkOut]),
                    status: 'present', // Default status
                }

                // Validate record
                const validationError = validateAttendanceRecord(record)
                if (validationError) {
                    record.error = validationError
                }

                records.push(record)
            } catch (error: any) {
                errors.push(`Row ${i + 1}: ${error.message}`)
            }
        }

        return {
            records,
            errors,
            totalRecords: records.length,
        }
    } catch (error: any) {
        throw new Error(`Failed to parse Excel file: ${error.message}`)
    }
}

/**
 * Find column index by matching multiple possible names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
        const index = headers.findIndex(h =>
            h.toLowerCase().trim() === name.toLowerCase().trim()
        )
        if (index !== -1) return index
    }
    return -1
}

/**
 * Format cell value as string
 */
function formatValue(value: any): string {
    if (value === null || value === undefined || value === '') {
        return ''
    }
    return String(value).trim()
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(value: any): string {
    if (!value) {
        throw new Error('Date is required')
    }

    // Handle Excel date serial number
    if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value)
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }

    // Handle date string
    const dateStr = String(value).trim()

    // Try to parse as YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr
    }

    // Try to parse with Date constructor
    const parsed = new Date(dateStr)
    if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear()
        const month = String(parsed.getMonth() + 1).padStart(2, '0')
        const day = String(parsed.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    throw new Error(`Invalid date format: ${dateStr}`)
}

/**
 * Format time to HH:MM:SS or null if empty
 */
function formatTime(value: any): string | null {
    if (value === null || value === undefined || value === '' || value === '-') {
        return null
    }

    // Handle Excel time serial number (fraction of a day)
    if (typeof value === 'number') {
        const totalSeconds = Math.round(value * 24 * 60 * 60)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    const timeStr = String(value).trim()

    // Already in HH:MM:SS format
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr
    }

    // HH:MM format - add :00 for seconds
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return `${timeStr}:00`
    }

    // H:MM or HH:M format
    if (/^\d{1,2}:\d{1,2}$/.test(timeStr)) {
        const [h, m] = timeStr.split(':')
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`
    }

    // Invalid time format, return null
    return null
}

/**
 * Validate attendance record
 */
export function validateAttendanceRecord(record: AttendanceRecord): string | null {
    if (!record.personId) {
        return 'Person ID is required'
    }

    if (!record.name) {
        return 'Name is required'
    }

    if (!record.date) {
        return 'Date is required'
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        return 'Invalid date format (expected YYYY-MM-DD)'
    }

    // Validate time formats if present
    if (record.checkIn && !/^\d{2}:\d{2}:\d{2}$/.test(record.checkIn)) {
        return 'Invalid check-in time format (expected HH:MM:SS)'
    }

    if (record.checkOut && !/^\d{2}:\d{2}:\d{2}$/.test(record.checkOut)) {
        return 'Invalid check-out time format (expected HH:MM:SS)'
    }

    return null
}
