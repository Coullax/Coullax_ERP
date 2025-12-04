import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatDateTime, formatDate } from './utils'

// Request type labels for display
const REQUEST_TYPE_LABELS: Record<string, string> = {
  leave: 'Leave Request',
  overtime: 'Overtime Request',
  travel_request: 'Travel Request',
  expense_reimbursement: 'Expense Reimbursement',
  attendance_regularization: 'Attendance Regularization',
  asset_request: 'Asset Request',
  resignation: 'Resignation',
  payroll_query: 'Payroll Query',
  document_request: 'Document Request',
  covering: 'Covering Request',
}

// Get request details as formatted text
export function getRequestDetailsText(request: any): string {
  const details: string[] = []
  
  // Add common fields
  details.push(`Request Type: ${REQUEST_TYPE_LABELS[request.request_type] || request.request_type}`)
  details.push(`Employee: ${request.employee?.profile?.full_name || 'Unknown'}`)
  details.push(`Employee ID: ${request.employee?.employee_id || 'N/A'}`)
  details.push(`Submitted: ${formatDateTime(request.submitted_at)}`)
  details.push(`Status: ${request.status.toUpperCase()}`)
  
  if (request.reviewed_by) {
    details.push(`Reviewed By: ${request.reviewer?.full_name || 'Unknown'}`)
    details.push(`Reviewed At: ${formatDateTime(request.reviewed_at)}`)
  }
  
  if (request.review_notes) {
    details.push(`Review Notes: ${request.review_notes}`)
  }
  
  return details.join('\n')
}

// Generate PDF for a single request
export function generateRequestPDF(request: any) {
  const doc = new jsPDF()
  
  // Add header
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('Request Details', 14, 20)
  
  // Add metadata
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated on: ${formatDateTime(new Date())}`, 14, 28)
  
  // Draw separator line
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 32, 196, 32)
  
  // Request information
  doc.setFontSize(12)
  doc.setTextColor(40, 40, 40)
  
  let yPos = 42
  
  // Request Type
  doc.setFont('helvetica', 'bold')
  doc.text('Request Type:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(REQUEST_TYPE_LABELS[request.request_type] || request.request_type, 60, yPos)
  yPos += 8
  
  // Employee Information
  doc.setFont('helvetica', 'bold')
  doc.text('Employee:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(request.employee?.profile?.full_name || 'Unknown', 60, yPos)
  yPos += 8
  
  doc.setFont('helvetica', 'bold')
  doc.text('Employee ID:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(request.employee?.employee_id || 'N/A', 60, yPos)
  yPos += 8
  
  doc.setFont('helvetica', 'bold')
  doc.text('Email:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(request.employee?.profile?.email || 'N/A', 60, yPos)
  yPos += 10
  
  // Request Details
  doc.setFont('helvetica', 'bold')
  doc.text('Submitted Date:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateTime(request.submitted_at), 60, yPos)
  yPos += 8
  
  // Status with color
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 14, yPos)
  
  // Set color based on status
  if (request.status === 'approved') {
    doc.setTextColor(0, 150, 0)
  } else if (request.status === 'rejected') {
    doc.setTextColor(200, 0, 0)
  } else if (request.status === 'pending') {
    doc.setTextColor(200, 150, 0)
  }
  
  doc.setFont('helvetica', 'bold')
  doc.text(request.status.toUpperCase(), 60, yPos)
  doc.setTextColor(40, 40, 40)
  yPos += 10
  
  // Review information if available
  if (request.reviewed_by) {
    doc.line(14, yPos, 196, yPos)
    yPos += 8
    
    doc.setFont('helvetica', 'bold')
    doc.text('Reviewed By:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(request.reviewer?.full_name || 'Unknown', 60, yPos)
    yPos += 8
    
    doc.setFont('helvetica', 'bold')
    doc.text('Reviewed Date:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDateTime(request.reviewed_at), 60, yPos)
    yPos += 8
    
    if (request.review_notes) {
      doc.setFont('helvetica', 'bold')
      doc.text('Review Notes:', 14, yPos)
      yPos += 6
      
      doc.setFont('helvetica', 'normal')
      const splitNotes = doc.splitTextToSize(request.review_notes, 170)
      doc.text(splitNotes, 14, yPos)
      yPos += splitNotes.length * 6 + 4
    }
  }
  
  // Add footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('This is a system-generated document.', 14, 285)
  
  // Generate filename
  const fileName = `Request_${request.request_type}_${request.employee?.employee_id || 'unknown'}_${new Date().getTime()}.pdf`
  
  // Save the PDF
  doc.save(fileName)
}

// Generate Excel for multiple requests
export function generateRequestsExcel(requests: any[], statusFilter: string = 'all') {
  // Prepare data for Excel
  const excelData = requests.map(request => ({
    'Request ID': request.id.slice(0, 8),
    'Request Type': REQUEST_TYPE_LABELS[request.request_type] || request.request_type,
    'Employee Name': request.employee?.profile?.full_name || 'Unknown',
    'Employee ID': request.employee?.employee_id || 'N/A',
    'Email': request.employee?.profile?.email || 'N/A',
    'Submitted Date': formatDateTime(request.submitted_at),
    'Status': request.status.toUpperCase(),
    'Reviewed By': request.reviewer?.full_name || 'N/A',
    'Reviewed Date': request.reviewed_at ? formatDateTime(request.reviewed_at) : 'N/A',
    'Review Notes': request.review_notes || 'N/A',
  }))
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData)
  
  // Set column widths
  const columnWidths = [
    { wch: 12 }, // Request ID
    { wch: 25 }, // Request Type
    { wch: 20 }, // Employee Name
    { wch: 15 }, // Employee ID
    { wch: 25 }, // Email
    { wch: 20 }, // Submitted Date
    { wch: 12 }, // Status
    { wch: 20 }, // Reviewed By
    { wch: 20 }, // Reviewed Date
    { wch: 40 }, // Review Notes
  ]
  worksheet['!cols'] = columnWidths
  
  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests')
  
  // Generate filename
  const statusText = statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
  const fileName = `Requests_${statusText}_${formatDate(new Date()).replace(/\s/g, '_')}.xlsx`
  
  // Save the file
  XLSX.writeFile(workbook, fileName)
}
