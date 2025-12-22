'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { teamLeadApproveRequest, teamLeadAddWorkDescription, teamLeadVerifyCoveringWork, updateRequestStatus, upsertCoveringHours } from '@/app/actions/request-actions'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const [workDescription, setWorkDescription] = useState('')
  const [coveringDecision, setCoveringDecision] = useState<string>('')
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
      if (statusFilter === 'pending' || statusFilter === 'team_leader_approval_pending') {
        // Team leads see both team_leader_approval_pending and proof_verification_pending requests
        filtered = filtered.filter(r => r.status === 'team_leader_approval_pending' || r.status === 'proof_verification_pending')
      } else if (statusFilter === 'approved') {
        // Show both fully approved and admin_approval_pending (approved by team lead)
        filtered = filtered.filter(r => r.status === 'approved' || r.status === 'admin_approval_pending')
      } else {
        filtered = filtered.filter(r => r.status === statusFilter)
      }
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
    pending: requests.filter(r => r.status === 'team_leader_approval_pending' || r.status === 'proof_verification_pending').length,
    approved: requests.filter(r => r.status === 'approved' || r.status === 'admin_approval_pending').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    proof_verification_pending: requests.filter(r => r.status === 'proof_verification_pending').length,
  }

  const handleApprove = async (requestId: string) => {
    // Check if it's a covering request needing work description
    if (selectedRequest?.status === 'team_leader_approval_pending' && selectedRequest?.request_type === 'covering' && !workDescription.trim()) {
      toast.error('Please provide work description for covering request')
      return
    }

    setLoading(true)
    try {
      if (selectedRequest?.status === 'proof_verification_pending') {
        // Verify covering work proof
        await teamLeadVerifyCoveringWork(requestId, reviewerId, true, notes || undefined)
        toast.success('Proof verified and approved!')
      } else if (selectedRequest?.request_type === 'covering') {
        // Use teamLeadAddWorkDescription for covering requests
        await teamLeadAddWorkDescription(requestId, reviewerId, workDescription, true, notes || undefined)
        toast.success('Covering request approved with work description!')
      } else {
        // Team lead approves other types - use teamLeadApproveRequest with approve=true
        await teamLeadApproveRequest(requestId, reviewerId, true, notes || undefined)
        toast.success('Request approved and sent to admin for final approval!')
      }

      setDialogOpen(false)
      setSelectedRequest(null)
      setNotes('')
      setWorkDescription('')
      setCoveringDecision('')
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
      // Team lead rejects - use teamLeadApproveRequest with approve=false and notes
      await teamLeadApproveRequest(requestId, reviewerId, false, notes)
      toast.success('Request rejected - no admin review required')
      setDialogOpen(false)
      setSelectedRequest(null)
      setNotes('')
      setWorkDescription('')
      setCoveringDecision('')
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
    console.log('Request Details:', request)
    setSelectedRequest(request)
    setDialogOpen(true)
    setNotes('')
    setCoveringDecision('')
  }

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter)
    setOffset(0)
  }

  // Helper function to calculate hours between two time strings (HH:MM:SS format)
  const calculateLeaveHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    const diffMinutes = endMinutes - startMinutes
    return diffMinutes / 60
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium',
      approved: 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium',
      rejected: 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium',
      cancelled: 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium',
      admin_approval_pending: 'bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium',
      team_leader_approval_pending: 'bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium',
      admin_final_approval_pending: 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium',
      proof_verification_pending: 'bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium',
      awaiting_proof_submission: 'bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-medium',
    }
    const className = variants[status] || 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium'
    const label = status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
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
          if (leaveData.covering_decision) {
            const decisionLabel = leaveData.covering_decision === 'no_need_to_cover'
              ? 'No Need to Cover'
              : leaveData.covering_decision.charAt(0).toUpperCase() + leaveData.covering_decision.slice(1)
            details.push({ label: 'Covering Decision', value: decisionLabel, highlight: true })
          }
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

        console.log('Covering Request Data:', coveringData)
        console.log('Full Request Object:', request)

        // if (coveringData) {
        details.push({ label: 'Covering Dated', value: format(new Date(coveringData.covering_date), 'MMMM dd, yyyy'), highlight: true })
        if (coveringData.start_time) details.push({ label: 'Start Time', value: coveringData.start_time })
        if (coveringData.end_time) details.push({ label: 'End Time', value: coveringData.end_time })
        // Calculate hours if both times are available
        if (coveringData.start_time && coveringData.end_time) {
          const hours = calculateLeaveHours(coveringData.start_time, coveringData.end_time)
          details.push({ label: 'Total Hours', value: `${hours.toFixed(1)} hour(s)`, highlight: true })
        }
        if (coveringData.work_description) details.push({ label: 'Work Description', value: coveringData.work_description })
        if (coveringData.covering_decision) {
          const decisionLabel = coveringData.covering_decision === 'no_need_to_cover'
            ? 'No Need to Cover'
            : coveringData.covering_decision.charAt(0).toUpperCase() + coveringData.covering_decision.slice(1)
          details.push({ label: 'Covering Decision', value: decisionLabel, highlight: true })
        }
        // }
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
                statusFilter.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Requests'}
            </span>
            <span className="text-sm font-normal text-gray-500">
              Showing {Math.min(offset + limit, filteredRequests.length)} of {filteredRequests.length}
            </span>
          </CardTitle>
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={statusFilter === 'team_leader_approval_pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('team_leader_approval_pending')
                setOffset(0)
              }}
              className="gap-1"
            >
              Team Lead Approval Pending
              {stats.pending > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
                  {stats.pending}
                </span>
              )}
            </Button>
            <Button
              variant={statusFilter === 'proof_verification_pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('proof_verification_pending')
                setOffset(0)
              }}
              className="gap-1"
            >
              Proof Verification Pending
              {stats.proof_verification_pending > 0 && (
                <span className="ml-1 px-1.5 py-0.5 min-w-5 min-h-5 bg-red-500 text-white rounded-full text-xs font-bold">
                  {stats.proof_verification_pending}
                </span>
              )}
            </Button>
            <Button
              variant={statusFilter === 'admin_approval_pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('admin_approval_pending')
                setOffset(0)
              }}
              className="gap-1"
            >
              Admin Approval Pending
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('approved')
                setOffset(0)
              }}
              className="gap-1"
            >
              Approved
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('rejected')
                setOffset(0)
              }}
              className="gap-1"
            >
              Rejected
            </Button>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('all')
                setOffset(0)
              }}
            >
              All Requests
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No requests found</p>
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
                      {REQUEST_TYPE_LABELS[selectedRequest.request_type] || selectedRequest.request_type}
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
                  {selectedRequest.request_type === 'leave' && selectedRequest.leave_requests?.[0] && (
                    <>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Leave Start Date</p>
                          <p className="font-medium">{format(new Date(selectedRequest.leave_requests[0].start_date), 'MMMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Leave End Date</p>
                          <p className="font-medium">{format(new Date(selectedRequest.leave_requests[0].end_date), 'MMMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Leave Duration</p>
                        <p className="font-medium capitalize">{selectedRequest.leave_requests[0].leave_duration.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Leave Hours</p>
                        <p className="font-medium">
                          {calculateLeaveHours(
                            selectedRequest.leave_requests[0].start_time,
                            selectedRequest.leave_requests[0].end_time
                          ).toFixed(1)} hours
                        </p>
                      </div>
                    </>
                  )}

                  {selectedRequest.request_type === 'covering' && selectedRequest.covering_requests?.[0] && (
                    <>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Covering Date</p>
                          <p className="font-medium">{format(new Date(selectedRequest.covering_requests[0].covering_date), 'MMMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Covering Start Time</p>
                          <p className="font-medium">{selectedRequest.covering_requests[0].start_time}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-500 text-xs">Covering End Time</p>
                          <p className="font-medium">{selectedRequest.covering_requests[0].end_time}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Covering Hours</p>
                        <p className="font-medium">
                          {calculateLeaveHours(
                            selectedRequest.covering_requests[0].start_time,
                            selectedRequest.covering_requests[0].end_time
                          ).toFixed(1)} hours
                        </p>
                      </div>
                    </>
                  )}
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

              {selectedRequest.request_data && Object.keys(selectedRequest.request_data).length > 0 && (<Separator />)}

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

              {/* <Separator /> */}

              {/* Review Information */}
              {/* {selectedRequest.reviewed_by ? (
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
              )} */}

              {/* Proof Preview - only for proof_verification_pending status */}
              {(selectedRequest.status === 'proof_verification_pending' || selectedRequest.status === 'admin_final_approval_pending' || selectedRequest.status === 'approved') && selectedRequest.request_type === 'covering' && (
                <>
                  <Separator />
                  <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-900">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Submitted Proof of Work
                    </h4>
                    <div className="space-y-3">
                      {selectedRequest.covering_requests?.[0]?.attachment_type === 'commit_link' && selectedRequest.covering_requests?.[0]?.commit_link && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Commit Link</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={selectedRequest.covering_requests[0].commit_link}
                              readOnly
                              className="flex-1 bg-white dark:bg-gray-900"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedRequest.covering_requests[0].commit_link)
                                toast.success('Link copied to clipboard!')
                              }}
                            >
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => window.open(selectedRequest.covering_requests[0].commit_link, '_blank')}
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      )}

                      {selectedRequest.covering_requests?.[0]?.attachment_type === 'file_upload' && selectedRequest.covering_requests?.[0]?.covering_files && selectedRequest.covering_requests[0].covering_files.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Uploaded Files ({selectedRequest.covering_requests[0].covering_files.length})</Label>
                          <div className="grid grid-cols-1 gap-2">
                            {selectedRequest.covering_requests[0].covering_files.map((file: string, index: number) => {
                              const fileName = file.split('/').pop() || 'file'
                              const isImage = file.match(/\.(jpg|jpeg|png|gif|webp)$/i)

                              return (
                                <div key={index} className="border rounded-lg p-3 bg-white dark:bg-gray-900">
                                  {isImage ? (
                                    <div className="space-y-2">
                                      <img
                                        src={file}
                                        alt={fileName}
                                        className="w-full h-48 object-contain rounded border"
                                      />
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{fileName}</span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(file, '_blank')}
                                        >
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm truncate">{fileName}</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(file, '_blank')}
                                      >
                                        Download
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Review Information */}
              {selectedRequest.reviewed_by || (selectedRequest.request_type === 'covering' && selectedRequest.covering_requests?.[0]?.verified_by) ? (
                <div className="space-y-3">
                  {/* Team Lead Verification - for covering requests */}
                  {selectedRequest.request_type === 'covering' && selectedRequest.covering_requests?.[0]?.verified_by && (
                    <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-900">
                      <h4 className="font-semibold mb-3">Team Lead Verification</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Verified By:</span>
                          <span className="font-medium">{selectedRequest.covering_requests[0].verified_by_profile?.full_name || 'Unknown'}</span>
                        </div>
                        {selectedRequest.covering_requests[0].work_verified_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Verified Date:</span>
                            <span className="font-medium">{formatDateTime(selectedRequest.covering_requests[0].work_verified_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Admin/Final Approval */}
                  {selectedRequest.reviewed_by && (
                    <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
                      <h4 className="font-semibold mb-3">
                        {selectedRequest.request_type === 'covering' && selectedRequest.covering_requests?.[0]?.verified_by
                          ? 'Admin Final Approval'
                          : 'Review Information'}
                      </h4>
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
                  )}
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
              {selectedRequest.status === 'team_leader_approval_pending' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    {/* Covering Decision Dropdown - only for covering requests */}
                    {selectedRequest.request_type === 'leave' && (
                      <div className="space-y-2">
                        <Label htmlFor="covering-decision">Covering Decision</Label>
                        <Select value={coveringDecision} onValueChange={setCoveringDecision}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select covering decision" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leave">Leave</SelectItem>
                            <SelectItem value="cover">Cover</SelectItem>
                            <SelectItem value="no_need_to_cover">No Need to Cover</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Work Description - only for covering requests */}
                    {selectedRequest.request_type === 'covering' && (
                      <div className="space-y-2">
                        <Label htmlFor="work_description">What are the works you doing? *</Label>
                        <textarea
                          id="work_description"
                          value={workDescription}
                          onChange={(e) => setWorkDescription(e.target.value)}
                          required
                          rows={4}
                          className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                          placeholder="Describe the work you will be doing during this coverage period..."
                        />
                      </div>
                    )}

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

              {/* Actions for proof verification */}
              {selectedRequest.status === 'proof_verification_pending' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verify-notes">Verification Notes (Optional for approval, Required for rejection)</Label>
                      <textarea
                        id="verify-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                        placeholder="Add your verification comments here..."
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {(selectedRequest?.status === 'team_leader_approval_pending' || selectedRequest?.status === 'proof_verification_pending') ? (
              <>
                <Button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={loading}
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  {selectedRequest.status === 'proof_verification_pending' ? 'Verify & Approve' : 'Approve'}
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
