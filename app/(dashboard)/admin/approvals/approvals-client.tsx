'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { updateRequestStatus } from '@/app/actions/request-actions'
import { CheckCircle, XCircle, FileText, User, Download, FileSpreadsheet, Loader2, Calendar, CalendarDays } from 'lucide-react'
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

  const handleRowClick = (request: any) => {
    setSelectedRequest(request)
    setDialogOpen(true)
    setNotes('')
  }

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter)
    setOffset(0)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      approved: { variant: 'success', label: 'Approved', className: 'bg-green-100 text-green-700' },
      rejected: { variant: 'destructive', label: 'Rejected', className: 'bg-red-100 text-red-700' },
      cancelled: { variant: 'outline', label: 'Cancelled', className: 'bg-gray-100 text-gray-700' },
    }
    const config = variants[status] || { variant: 'secondary', label: status, className: '' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // Helper to render request details in a structured way
  const renderRequestDetails = (request: any) => {
    const details: { label: string; value: any }[] = []

    // Add request-specific data
    if (request.request_data) {
      Object.entries(request.request_data).forEach(([key, value]) => {
        details.push({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
        })
      })
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
          Export to Excel
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
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {statusFilter === 'all' ? 'All Requests' :
                statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' Requests'}
              ({filteredRequests.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <TableRow
                      key={request.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(request)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <FileText className="w-4 h-4" />
                          </div>
                          {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {request.employee?.profile?.full_name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>{request.employee?.employee_id || 'N/A'}</TableCell>
                      <TableCell>{formatDateTime(request.submitted_at)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadPDF(request)
                          }}
                          className="h-8 gap-1"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {offset + 1} to {Math.min(offset + limit, filteredRequests.length)} of {filteredRequests.length} requests
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-3">
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
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
              {/* Request Info */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">
                  {REQUEST_TYPE_LABELS[selectedRequest.request_type]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
                </div>
              </div>

              {/* Request-specific data */}
              {selectedRequest.request_data && Object.keys(selectedRequest.request_data).length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Request Information
                  </h4>
                  <div className="space-y-3">
                    {renderRequestDetails(selectedRequest).map((detail, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-4 text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 col-span-1">
                          {detail.label}:
                        </span>
                        <span className="text-gray-900 dark:text-gray-100 col-span-2">
                          {detail.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Information */}
              {selectedRequest.reviewed_by && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Review Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-600 dark:text-gray-400">Reviewed By:</span>
                      <span className="col-span-2 font-medium">{selectedRequest.reviewer?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-600 dark:text-gray-400">Reviewed Date:</span>
                      <span className="col-span-2 font-medium">{formatDateTime(selectedRequest.reviewed_at)}</span>
                    </div>
                    {selectedRequest.review_notes && (
                      <div className="grid grid-cols-3 gap-4">
                        <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                        <p className="col-span-2 italic">{selectedRequest.review_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions for pending requests */}
              {selectedRequest.status === 'pending' && (
                <div className="border-t pt-4 space-y-4">
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
