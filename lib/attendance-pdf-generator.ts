import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

// Generate PDF for a single employee
export function generateAttendancePDF(data: AttendanceExportData): void {
    const doc = new jsPDF()
    const monthName = getMonthName(data.month)

    // Add title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Attendance Report', 105, 15, { align: 'center' })

    // Add employee details
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Employee: ${data.employeeName}`, 14, 30)
    doc.text(`Employee ID: ${data.employeeNumber}`, 14, 37)
    doc.text(`Period: ${monthName} ${data.year}`, 14, 44)

    // Prepare table data
    const tableData = data.dailyRecords.map(record => {
        const dateObj = new Date(record.date)
        const dayName = format(dateObj, 'EEE')
        const dateFormatted = format(dateObj, 'dd MMM yyyy')

        let checkIn = formatTime(record.checkIn)
        let checkOut = formatTime(record.checkOut)
        let hours = record.workingHours > 0 ? record.workingHours.toFixed(2) : '-'
        let notes = record.notes || ''

        // If it's a leave day, show leave type
        if (record.status === 'leave') {
            checkIn = '-'
            checkOut = '-'
            hours = '-'
            notes = record.leaveType ? record.leaveType.replace('_', ' ').toUpperCase() : 'LEAVE'
        }

        return [
            `${dayName}, ${dateFormatted}`,
            checkIn,
            checkOut,
            hours,
            notes
        ]
    })

    // Add attendance table
    autoTable(doc, {
        startY: 52,
        head: [['Date', 'Check-In', 'Check-Out', 'Hours', 'Notes/Leave Type']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 'auto' },
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
    })

    // Get the final Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY || 52

    // Add summary section
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Summary', 14, finalY + 15)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Leaves: ${data.summary.totalLeaves} days`, 14, finalY + 25)
    doc.text(`Total Working Hours: ${data.summary.totalWorkingHours.toFixed(2)} hours`, 14, finalY + 32)
    doc.text(`Covering Leaves Count: ${data.summary.coveringLeavesCount}`, 14, finalY + 39)
    doc.text(`Total Covering Hours: ${data.summary.totalCoveringHours.toFixed(2)} hours`, 14, finalY + 46)

    // Add footer with generation date
    const pageCount = doc.getNumberOfPages()
    doc.setFontSize(8)
    doc.setTextColor(128)
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.text(
            `Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
            105,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        )
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.width - 20,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
        )
    }

    // Download the PDF
    const fileName = `Attendance_${data.employeeName.replace(/\s+/g, '_')}_${monthName}_${data.year}.pdf`
    doc.save(fileName)
}

// Generate PDF for all employees
export function generateBulkAttendancePDF(allData: AttendanceExportData[]): void {
    const doc = new jsPDF()

    if (allData.length === 0) {
        doc.text('No attendance data available', 14, 20)
        doc.save('Attendance_Report.pdf')
        return
    }

    const monthName = getMonthName(allData[0].month)
    const year = allData[0].year

    allData.forEach((data, index) => {
        if (index > 0) {
            doc.addPage()
        }

        // Add title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Attendance Report', 105, 15, { align: 'center' })

        // Add employee details
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text(`Employee: ${data.employeeName}`, 14, 30)
        doc.text(`Employee ID: ${data.employeeNumber}`, 14, 37)
        doc.text(`Period: ${monthName} ${year}`, 14, 44)

        // Prepare table data
        const tableData = data.dailyRecords.map(record => {
            const dateObj = new Date(record.date)
            const dayName = format(dateObj, 'EEE')
            const dateFormatted = format(dateObj, 'dd MMM yyyy')

            let checkIn = formatTime(record.checkIn)
            let checkOut = formatTime(record.checkOut)
            let hours = record.workingHours > 0 ? record.workingHours.toFixed(2) : '-'
            let notes = record.notes || ''

            if (record.status === 'leave') {
                checkIn = '-'
                checkOut = '-'
                hours = '-'
                notes = record.leaveType ? record.leaveType.replace('_', ' ').toUpperCase() : 'LEAVE'
            }

            return [
                `${dayName}, ${dateFormatted}`,
                checkIn,
                checkOut,
                hours,
                notes
            ]
        })

        // Add attendance table
        autoTable(doc, {
            startY: 52,
            head: [['Date', 'Check-In', 'Check-Out', 'Hours', 'Notes/Leave Type']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 'auto' },
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
        })

        // Get the final Y position after the table
        const finalY = (doc as any).lastAutoTable.finalY || 52

        // Add summary section
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Summary', 14, finalY + 15)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Total Leaves: ${data.summary.totalLeaves} days`, 14, finalY + 25)
        doc.text(`Total Working Hours: ${data.summary.totalWorkingHours.toFixed(2)} hours`, 14, finalY + 32)
        doc.text(`Covering Leaves Count: ${data.summary.coveringLeavesCount}`, 14, finalY + 39)
        doc.text(`Total Covering Hours: ${data.summary.totalCoveringHours.toFixed(2)} hours`, 14, finalY + 46)
    })

    // Add footer with generation date
    const pageCount = doc.getNumberOfPages()
    doc.setFontSize(8)
    doc.setTextColor(128)
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.text(
            `Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
            105,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        )
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.width - 20,
            doc.internal.pageSize.height - 10,
            { align: 'right' }
        )
    }

    // Download the PDF
    const fileName = `Attendance_All_Employees_${monthName}_${year}.pdf`
    doc.save(fileName)
}
