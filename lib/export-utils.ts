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

// Add PDF Header with company branding
function addPDFHeader(doc: jsPDF) {
  // Coullax branding
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('coullax', 14, 15)
  
  // Contact information
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text('www.coullax.com', 14, 22)
  doc.text('support@coullax.com', 14, 27)
  doc.text('+94 11 22 77 111  |  +94 70 11 777 11', 14, 32)
  
  // Separator line
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(14, 36, 196, 36)
}

// Add PDF Footer with company address and info
function addPDFFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.height
  const footerY = pageHeight - 25
  
  // Top separator line for footer
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(14, footerY - 5, 196, footerY - 5)
  
  // Footer background (dark)
  doc.setFillColor(40, 40, 40)
  doc.rect(0, footerY, 210, 30, 'F')
  
  // Address (left side)
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('No: 256/56, 2nd Lane,', 14, footerY + 5)
  doc.text('New city Garden, Weliwita, Kaduwela,', 14, footerY + 9)
  doc.text('Sri Lanka', 14, footerY + 13)
  
  // Social media and reference (right side)
  doc.setFontSize(8)
  doc.text('@coullax', 196, footerY + 7, { align: 'right' })
  doc.setFontSize(7)
  doc.setTextColor(200, 200, 200)
  doc.text('PV - 00256728', 196, footerY + 13, { align: 'right' })
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
  addPDFHeader(doc)
  
  // Add title below header
  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.text('Request Details', 14, 46)
  
  // Add metadata
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated on: ${formatDateTime(new Date())}`, 14, 52)
  
  // Draw separator line
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(14, 56, 196, 56)
  
  // Request information
  doc.setFontSize(11)
  doc.setTextColor(40, 40, 40)
  
  let yPos = 64
  
  // Request Type
  doc.setFont('helvetica', 'bold')
  doc.text('Request Type:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(REQUEST_TYPE_LABELS[request.request_type] || request.request_type, 60, yPos)
  yPos += 7
  
  // Employee Information
  doc.setFont('helvetica', 'bold')
  doc.text('Employee:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(request.employee?.profile?.full_name || 'Unknown', 60, yPos)
  yPos += 7
  
  doc.setFont('helvetica', 'bold')
  doc.text('Employee ID:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(request.employee?.employee_id || 'N/A', 60, yPos)
  yPos += 7
  
  doc.setFont('helvetica', 'bold')
  doc.text('Email:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(request.employee?.profile?.email || 'N/A', 60, yPos)
  yPos += 9
  
  // Request Details
  doc.setFont('helvetica', 'bold')
  doc.text('Submitted Date:', 14, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateTime(request.submitted_at), 60, yPos)
  yPos += 7
  
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
  yPos += 9
  
  // Review information if available
  if (request.reviewed_by) {
    doc.setDrawColor(220, 220, 220)
    doc.line(14, yPos, 196, yPos)
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Reviewed By:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(request.reviewer?.full_name || 'Unknown', 60, yPos)
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Reviewed Date:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDateTime(request.reviewed_at), 60, yPos)
    yPos += 7
    
    if (request.review_notes) {
      doc.setFont('helvetica', 'bold')
      doc.text('Review Notes:', 14, yPos)
      yPos += 5
      
      doc.setFont('helvetica', 'normal')
      const splitNotes = doc.splitTextToSize(request.review_notes, 170)
      doc.text(splitNotes, 14, yPos)
      yPos += splitNotes.length * 5 + 4
    }
  }
  
  // Add footer
  addPDFFooter(doc)
  
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
