import * as XLSX from 'xlsx'
import { format } from 'date-fns'

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

// Format time from HH:MM:SS to HH:MM
function formatTime(time: string | null): string {
    if (!time) return '-'
    return time.substring(0, 5)
}

// Get month name from month number (0-11)
function getMonthName(month: number): string {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month]
}

// Generate Excel for a single employee
export function generateAttendanceExcel(data: AttendanceExportData): void {
    const monthName = getMonthName(data.month)

    // Create worksheet data
    const worksheetData: any[][] = []

    // Add header rows
    worksheetData.push(['Attendance Report'])
    worksheetData.push([])
    worksheetData.push(['Employee:', data.employeeName])
    worksheetData.push(['Employee ID:', data.employeeNumber])
    worksheetData.push(['Period:', `${monthName} ${data.year}`])
    worksheetData.push([])

    // Add table headers
    worksheetData.push(['Date', 'Day', 'Check-In', 'Check-Out', 'Working Hours', 'Notes/Leave Type'])

    // Add attendance data
    data.dailyRecords.forEach(record => {
        const dateObj = new Date(record.date)
        const dayName = format(dateObj, 'EEE')
        const dateFormatted = format(dateObj, 'dd MMM yyyy')

        let checkIn = formatTime(record.checkIn)
        let checkOut = formatTime(record.checkOut)
        let hours: string | number = record.workingHours > 0 ? record.workingHours : '-'
        let notes = record.notes || ''

        // If it's a leave day, show leave type
        if (record.status === 'leave') {
            checkIn = '-'
            checkOut = '-'
            hours = '-'
            notes = record.leaveType ? record.leaveType.replace('_', ' ').toUpperCase() : 'LEAVE'
        }

        worksheetData.push([
            dateFormatted,
            dayName,
            checkIn,
            checkOut,
            hours,
            notes
        ])
    })

    // Add empty row before summary
    worksheetData.push([])

    // Add summary section
    worksheetData.push(['Summary'])
    worksheetData.push(['Total Leaves:', `${data.summary.totalLeaves} days`])
    worksheetData.push(['Total Working Hours:', `${data.summary.totalWorkingHours.toFixed(2)} hours`])
    worksheetData.push(['Covering Leaves Count:', data.summary.coveringLeavesCount])
    worksheetData.push(['Total Covering Hours:', `${data.summary.totalCoveringHours.toFixed(2)} hours`])

    // Add generation timestamp
    worksheetData.push([])
    worksheetData.push([`Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`])

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Set column widths
    worksheet['!cols'] = [
        { wch: 15 }, // Date
        { wch: 10 }, // Day
        { wch: 12 }, // Check-In
        { wch: 12 }, // Check-Out
        { wch: 15 }, // Working Hours
        { wch: 30 }, // Notes/Leave Type
    ]

    // Apply styles to header row (row 7, 0-indexed as 6)
    const headerRow = 6
    const headerCells = ['A', 'B', 'C', 'D', 'E', 'F']
    headerCells.forEach(col => {
        const cellRef = `${col}${headerRow + 1}`
        if (worksheet[cellRef]) {
            worksheet[cellRef].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: 'CCCCCC' } },
                alignment: { horizontal: 'center' }
            }
        }
    })

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')

    // Download the Excel file
    const fileName = `Attendance_${data.employeeName.replace(/\s+/g, '_')}_${monthName}_${data.year}.xlsx`
    XLSX.writeFile(workbook, fileName)
}

// Generate Excel for all employees (multiple sheets)
export function generateBulkAttendanceExcel(allData: AttendanceExportData[]): void {
    if (allData.length === 0) {
        // Create empty workbook with message
        const worksheet = XLSX.utils.aoa_to_sheet([['No attendance data available']])
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')
        XLSX.writeFile(workbook, 'Attendance_Report.xlsx')
        return
    }

    const monthName = getMonthName(allData[0].month)
    const year = allData[0].year

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Create a sheet for each employee
    allData.forEach((data, index) => {
        const worksheetData: any[][] = []

        // Add header rows
        worksheetData.push(['Attendance Report'])
        worksheetData.push([])
        worksheetData.push(['Employee:', data.employeeName])
        worksheetData.push(['Employee ID:', data.employeeNumber])
        worksheetData.push(['Period:', `${monthName} ${year}`])
        worksheetData.push([])

        // Add table headers
        worksheetData.push(['Date', 'Day', 'Check-In', 'Check-Out', 'Working Hours', 'Notes/Leave Type'])

        // Add attendance data
        data.dailyRecords.forEach(record => {
            const dateObj = new Date(record.date)
            const dayName = format(dateObj, 'EEE')
            const dateFormatted = format(dateObj, 'dd MMM yyyy')

            let checkIn = formatTime(record.checkIn)
            let checkOut = formatTime(record.checkOut)
            let hours: string | number = record.workingHours > 0 ? record.workingHours : '-'
            let notes = record.notes || ''

            if (record.status === 'leave') {
                checkIn = '-'
                checkOut = '-'
                hours = '-'
                notes = record.leaveType ? record.leaveType.replace('_', ' ').toUpperCase() : 'LEAVE'
            }

            worksheetData.push([
                dateFormatted,
                dayName,
                checkIn,
                checkOut,
                hours,
                notes
            ])
        })

        // Add empty row before summary
        worksheetData.push([])

        // Add summary section
        worksheetData.push(['Summary'])
        worksheetData.push(['Total Leaves:', `${data.summary.totalLeaves} days`])
        worksheetData.push(['Total Working Hours:', `${data.summary.totalWorkingHours.toFixed(2)} hours`])
        worksheetData.push(['Covering Leaves Count:', data.summary.coveringLeavesCount])
        worksheetData.push(['Total Covering Hours:', `${data.summary.totalCoveringHours.toFixed(2)} hours`])

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

        // Set column widths
        worksheet['!cols'] = [
            { wch: 15 }, // Date
            { wch: 10 }, // Day
            { wch: 12 }, // Check-In
            { wch: 12 }, // Check-Out
            { wch: 15 }, // Working Hours
            { wch: 30 }, // Notes/Leave Type
        ]

        // Create sheet name (max 31 characters for Excel)
        let sheetName = data.employeeName.substring(0, 25)
        if (sheetName.length < data.employeeName.length) {
            sheetName += '...'
        }

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    // Add generation timestamp on first sheet
    if (workbook.Sheets[workbook.SheetNames[0]]) {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const lastRow = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1').e.r + 2
        XLSX.utils.sheet_add_aoa(firstSheet, [[`Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`]], { origin: `A${lastRow}` })
    }

    // Download the Excel file
    const fileName = `Attendance_All_Employees_${monthName}_${year}.xlsx`
    XLSX.writeFile(workbook, fileName)
}
