'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { updateRequestStatus } from '@/app/actions/request-actions'
import { CheckCircle, XCircle, FileText, User, Download, FileSpreadsheet, Loader2, Calendar, CalendarDays, MoreHorizontal, Eye } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { generateRequestPDF, generateRequestsExcel } from '@/lib/export-utils'
import { format, subDays, subMonths, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

interface ApprovalsPageClientProps {
  requests: any[]
  reviewerId: string
}

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

type DateFilter = '1d' | '7d' | '1m' | 'custom' | 'all'

export function ApprovalsPageClient({ requests, reviewerId }: ApprovalsPageClientProps) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 15

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date()
    switch (dateFilter) {
      case '1d':
        return { start: subDays(now, 1), end: now }
      case '7d':
        return { start: subDays(now, 7), end: now }
      case '1m':
        return { start: subMonths(now, 1), end: now }
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: startOfDay(new Date(customStartDate)),
            end: endOfDay(new Date(customEndDate))
          }
        }
        return null
      default:
        return null
    }
  }, [dateFilter, customStartDate, customEndDate])

  // Filter requests based on status and date
  const filteredRequests = useMemo(() => {
    let filtered = requests

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    // Date filter
    if (dateRange) {
      filtered = filtered.filter(r => {
        const submittedDate = new Date(r.submitted_at)
        return isAfter(submittedDate, dateRange.start) && isBefore(submittedDate, dateRange.end)
      })
    }

    return filtered
  }, [requests, statusFilter, dateRange])

  // Paginate filtered requests
  const paginatedRequests = filteredRequests.slice(offset, offset + limit)
  const totalPages = Math.ceil(filteredRequests.length / limit)
  const currentPage = Math.floor(offset / limit) + 1

  // Calculate stats
  const stats = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  const handleApprove = async (requestId: string) => {
    setLoading(true)
    try {
      await updateRequestStatus(requestId, 'approved', reviewerId, notes || undefined)
      toast.success('Request approved successfully!')
      setDialogOpen(false)
      setSelectedRequest(null)
      setNotes('')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve request')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!notes) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    try {
      await updateRequestStatus(requestId, 'rejected', reviewerId, notes)
      toast.success('Request rejected')
      setDialogOpen(false)
      setSelectedRequest(null)
      setNotes('')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject request')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = (request: any) => {
    try {
      generateRequestPDF(request)
      toast.success('PDF downloaded successfully!')
    } catch (error) {
      toast.error('Failed to generate PDF')
    }
  }

  const handleExportExcel = () => {
    try {
      generateRequestsExcel(filteredRequests, statusFilter)
      toast.success('Excel file downloaded successfully!')
    } catch (error) {
      toast.error('Failed to generate Excel file')
    }
  }

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request)
    setDialogOpen(true)
    setNotes('')
  }

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter)
    setOffset(0)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium',
      approved: 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium',
      rejected: 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium',
      cancelled: 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium',
    }
    const className = variants[status] || 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium'
    const label = status.charAt(0).toUpperCase() + status.slice(1)
    return <span className={className}>{label}</span>
  }

  // Helper to render request details in a structured way based on request type
  const renderRequestDetails = (request: any) => {
    const details: { label: string; value: any; highlight?: boolean }[] = []

    switch (request.request_type) {
      case 'leave':
        // Prioritize data from leave_requests table over request_data
        const leaveData = Array.isArray(request.leave_requests)
          ? request.leave_requests[0]
          : request.leave_requests || request.request_data
        
        if (leaveData) {
          if (leaveData.leave_type) details.push({ label: 'Leave Type', value: leaveData.leave_type })
          if (leaveData.start_date) details.push({ label: 'Start Date', value: format(new Date(leaveData.start_date), 'MMMM dd, yyyy'), highlight: true })
          if (leaveData.end_date) details.push({ label: 'End Date', value: format(new Date(leaveData.end_date), 'MMMM dd, yyyy'), highlight: true })
          if (leaveData.start_time) details.push({ label: 'Start Time', value: leaveData.start_time })
          if (leaveData.end_time) details.push({ label: 'End Time', value: leaveData.end_time })
          if (leaveData.check_in_time) details.push({ label: 'Check-in Time', value: leaveData.check_in_time })
          if (leaveData.check_out_time) details.push({ label: 'Check-out Time', value: leaveData.check_out_time })
          if (leaveData.total_days) details.push({ label: 'Total Days', value: `${leaveData.total_days} day(s)`, highlight: true })
          if (leaveData.reason) details.push({ label: 'Reason', value: leaveData.reason })
          if (leaveData.description) details.push({ label: 'Description', value: leaveData.description })
        }
        break

      case 'overtime':
        const overtimeData = Array.isArray(request.overtime_requests)
          ? request.overtime_requests[0]
          : request.overtime_requests || request.request_data
        
        if (overtimeData) {
          if (overtimeData.date) details.push({ label: 'Date', value: format(new Date(overtimeData.date), 'MMMM dd, yyyy'), highlight: true })
          if (overtimeData.start_time) details.push({ label: 'Start Time', value: overtimeData.start_time })
          if (overtimeData.end_time) details.push({ label: 'End Time', value: overtimeData.end_time })
          if (overtimeData.hours) details.push({ label: 'Hours', value: `${overtimeData.hours} hour(s)`, highlight: true })
          if (overtimeData.reason) details.push({ label: 'Reason', value: overtimeData.reason })
          if (overtimeData.assigned_supervisor) details.push({ label: 'Assigned Supervisor ID', value: overtimeData.assigned_supervisor })
        }
        break

      case 'travel_request':
        const travelData = Array.isArray(request.travel_requests)
          ? request.travel_requests[0]
          : request.travel_requests || request.request_data
        
        if (travelData) {
          if (travelData.destination) details.push({ label: 'Destination', value: travelData.destination, highlight: true })
          if (travelData.start_date) details.push({ label: 'Start Date', value: format(new Date(travelData.start_date), 'MMMM dd, yyyy') })
          if (travelData.end_date) details.push({ label: 'End Date', value: format(new Date(travelData.end_date), 'MMMM dd, yyyy') })
          if (travelData.purpose) details.push({ label: 'Purpose', value: travelData.purpose })
          if (travelData.estimated_cost) details.push({ label: 'Estimated Cost', value: `$${travelData.estimated_cost}` })
          if (travelData.transport_mode) details.push({ label: 'Transport Mode', value: travelData.transport_mode })
        }
        break

      case 'expense_reimbursement':
        const expenseData = Array.isArray(request.expense_reimbursements)
          ? request.expense_reimbursements[0]
          : request.expense_reimbursements || request.request_data
        
        if (expenseData) {
          if (expenseData.expense_type) details.push({ label: 'Expense Type', value: expenseData.expense_type })
          if (expenseData.amount) details.push({ label: 'Amount', value: `$${expenseData.amount}`, highlight: true })
          if (expenseData.expense_date) details.push({ label: 'Expense Date', value: format(new Date(expenseData.expense_date), 'MMMM dd, yyyy') })
          if (expenseData.description) details.push({ label: 'Description', value: expenseData.description })
          if (expenseData.attachments && expenseData.attachments.length > 0) {
            details.push({ label: 'Attachments', value: `${expenseData.attachments.length} file(s) attached` })
          }
        }
        break

      case 'attendance_regularization':
        const attendanceData = Array.isArray(request.attendance_regularization_requests)
          ? request.attendance_regularization_requests[0]
          : request.attendance_regularization_requests || request.request_data
        
        if (attendanceData) {
          if (attendanceData.date) details.push({ label: 'Date', value: format(new Date(attendanceData.date), 'MMMM dd, yyyy'), highlight: true })
          if (attendanceData.actual_time) details.push({ label: 'Actual Time', value: attendanceData.actual_time })
          if (attendanceData.requested_time) details.push({ label: 'Requested Time', value: attendanceData.requested_time })
          if (attendanceData.reason) details.push({ label: 'Reason', value: attendanceData.reason })
        }
        break

      case 'asset_request':
        const assetData = Array.isArray(request.asset_requests)
          ? request.asset_requests[0]
          : request.asset_requests || request.request_data
        
        if (assetData) {
          if (assetData.asset_type) details.push({ label: 'Asset Type', value: assetData.asset_type, highlight: true })
          if (assetData.quantity) details.push({ label: 'Quantity', value: assetData.quantity })
          if (assetData.reason) details.push({ label: 'Reason', value: assetData.reason })
        }
        break

      case 'resignation':
        const resignationData = Array.isArray(request.resignations)
          ? request.resignations[0]
          : request.resignations || request.request_data
        
        if (resignationData) {
          if (resignationData.last_working_date) details.push({ label: 'Last Working Date', value: format(new Date(resignationData.last_working_date), 'MMMM dd, yyyy'), highlight: true })
          if (resignationData.reason) details.push({ label: 'Reason', value: resignationData.reason })
          if (resignationData.feedback) details.push({ label: 'Feedback', value: resignationData.feedback })
          if (resignationData.document_url) details.push({ label: 'Document', value: 'Attached' })
        }
        break

      case 'covering':
        const coveringData = Array.isArray(request.covering_requests)
          ? request.covering_requests[0]
          : request.covering_requests || request.request_data
        
        if (coveringData) {
          if (coveringData.covering_date) details.push({ label: 'Covering Date', value: format(new Date(coveringData.covering_date), 'MMMM dd, yyyy'), highlight: true })
          if (coveringData.start_time) details.push({ label: 'Start Time', value: coveringData.start_time })
          if (coveringData.end_time) details.push({ label: 'End Time', value: coveringData.end_time })
          if (coveringData.work_description) details.push({ label: 'Work Description', value: coveringData.work_description })
        }
        break

      default:
        // Generic fallback for unknown request types - try request_data
        if (request.request_data) {
          Object.entries(request.request_data).forEach(([key, value]) => {
            details.push({
              label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
            })
          })
        }
    }

    return details
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approvals & Requests</h1>
          <p className="text-gray-500 mt-1">Review and manage employee requests</p>
        </div>
        <Button
          onClick={handleExportExcel}
          variant="outline"
          className="gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-black dark:ring-white' : ''}`}
          onClick={() => {
            setStatusFilter('all')
            setOffset(0)
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">All Requests</p>
                <p className="text-2xl font-bold">{stats.all}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-black dark:ring-white' : ''}`}
          onClick={() => {
            setStatusFilter('pending')
            setOffset(0)
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <XCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'approved' ? 'ring-2 ring-black dark:ring-white' : ''}`}
          onClick={() => {
            setStatusFilter('approved')
            setOffset(0)
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-black dark:ring-white' : ''}`}
          onClick={() => {
            setStatusFilter('rejected')
            setOffset(0)
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium">Filter by Date:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('all')}
              >
                All Time
              </Button>
              <Button
                variant={dateFilter === '1d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('1d')}
              >
                Last 24 Hours
              </Button>
              <Button
                variant={dateFilter === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('7d')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateFilter === '1m' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('1m')}
              >
                Last Month
              </Button>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('custom')}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Custom Range
              </Button>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex gap-2 items-center w-full md:w-auto">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full md:w-auto"
                  placeholder="Start Date"
                />
                <span className="text-gray-500">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full md:w-auto"
                  placeholder="End Date"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>
              {statusFilter === 'all' ? 'All Requests' :
                statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' Requests'}
            </span>
            <span className="text-sm font-normal text-gray-500">
              Showing {Math.min(offset + limit, filteredRequests.length)} of {filteredRequests.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No {statusFilter === 'all' ? '' : statusFilter} requests found</p>
              {dateFilter !== 'all' && (
                <p className="text-sm mt-2">Try adjusting your date filter</p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Type</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-sm">
                            {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {request.employee?.profile?.full_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {request.employee?.employee_id || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDateTime(request.submitted_at)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(request)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPDF(request)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setOffset((page - 1) * limit)}
                          className="w-8"
                        >
                          {page}
                        </Button>
                      )
                    })}
                    {totalPages > 5 && <span className="px-2 py-1">...</span>}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset(offset + limit)}
                      disabled={offset + limit >= filteredRequests.length}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Request ID and Type */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">
                    {REQUEST_TYPE_LABELS[selectedRequest.request_type]}
                  </h3>
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {selectedRequest.id.slice(0, 8)}
                  </span>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Request Type</p>
                      <p className="font-medium">
                        {REQUEST_TYPE_LABELS [selectedRequest.request_type] || selectedRequest.request_type}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-500 text-xs">Employee</p>
                        <p className="font-medium">
                          {selectedRequest.employee?.profile?.full_name}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Employee ID</p>
                      <p className="font-medium">{selectedRequest.employee?.employee_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Email</p>
                      <p className="font-medium">{selectedRequest.employee?.profile?.email}</p>
                    </div>
                    {selectedRequest.employee?.department && (
                      <div>
                        <p className="text-gray-500 text-xs">Department</p>
                        <p className="font-medium">{selectedRequest.employee.department.department_name}</p>
                      </div>
                    )}
                    {selectedRequest.employee?.designation && (
                      <div>
                        <p className="text-gray-500 text-xs">Designation</p>
                        <p className="font-medium">{selectedRequest.employee.designation.designation_name}</p>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-500 text-xs">Submitted</p>
                        <p className="font-medium">{formatDateTime(selectedRequest.submitted_at)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                    </div>
                    {selectedRequest.created_at && (
                      <div>
                        <p className="text-gray-500 text-xs">Created At</p>
                        <p className="font-medium text-xs">{formatDateTime(selectedRequest.created_at)}</p>
                      </div>
                    )}
                </div>
              </div>

              <Separator />

              {/* Request-specific data */}
              {selectedRequest.request_data && Object.keys(selectedRequest.request_data).length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Request Information
                  </h4>
                  <div className="space-y-3">
                    {renderRequestDetails(selectedRequest).map((detail, idx) => (
                      <div key={idx} className={`border-b last:border-0 pb-2 last:pb-0 ${detail.highlight ? 'bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded -mx-1' : ''}`}>
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          {detail.label}
                        </p>
                        <div className={`text-sm ${detail.highlight ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                          {detail.value.includes('{') || detail.value.includes('[') ? (
                            <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                              {detail.value}
                            </pre>
                          ) : (
                            <p className="break-words">{detail.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Review Information */}
              {selectedRequest.reviewed_by ? (
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
                  <h4 className="font-semibold mb-3">Review Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Reviewed By:</span>
                      <span className="font-medium">{selectedRequest.reviewer?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Reviewed Date:</span>
                      <span className="font-medium">{formatDateTime(selectedRequest.reviewed_at)}</span>
                    </div>
                    {selectedRequest.review_notes && (
                      <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                        <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Notes:</p>
                        <p className="italic bg-white dark:bg-gray-900 p-2 rounded text-sm">{selectedRequest.review_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    This request has not been reviewed yet.
                  </p>
                </div>
              )}

              {/* Actions for pending requests */}
              {selectedRequest.status === 'pending' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional for approval, Required for rejection)</Label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                        placeholder="Add your comments here..."
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedRequest?.status === 'pending' ? (
              <>
                <Button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={loading}
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
                <Button
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={loading}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Reject
                </Button>
              </>
            ) : null}
            <Button
              onClick={() => selectedRequest && handleDownloadPDF(selectedRequest)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
