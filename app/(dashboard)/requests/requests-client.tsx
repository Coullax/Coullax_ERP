'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination'
import { Plus, FileText, Clock, CheckCircle, XCircle, Calendar, CalendarDays, Trash2, Edit, Eye, MoreHorizontal, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { subDays, subMonths, startOfDay, endOfDay, isWithinInterval, parseISO, format } from 'date-fns'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface RequestsPageClientProps {
  requests: any[]
  userId: string
}

const REQUEST_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  leave: { label: 'Leave', icon: Calendar, color: 'blue' },
  overtime: { label: 'Overtime', icon: Clock, color: 'purple' },
  travel_request: { label: 'Travel', icon: FileText, color: 'green' },
  expense_reimbursement: { label: 'Expense', icon: FileText, color: 'orange' },
  attendance_regularization: { label: 'Attendance', icon: Clock, color: 'cyan' },
  asset_request: { label: 'Asset', icon: FileText, color: 'pink' },
  resignation: { label: 'Resignation', icon: FileText, color: 'red' },
  payroll_query: { label: 'Payroll', icon: FileText, color: 'yellow' },
  document_request: { label: 'Document', icon: FileText, color: 'indigo' },
  covering: { label: 'Covering', icon: FileText, color: 'teal' },
}

const REQUEST_LINKS = [
  { type: 'leave', label: 'Leave Request', description: 'Apply for sick, casual, or vacation leave' },
  { type: 'overtime', label: 'Overtime Request', description: 'Request overtime hours approval' },
  { type: 'travel', label: 'Travel Request', description: 'Request approval for business travel' },
  { type: 'expense', label: 'Expense Reimbursement', description: 'Submit expense claims for reimbursement' },
  { type: 'attendance_regularization', label: 'Attendance Regularization', description: 'Request attendance correction' },
  { type: 'asset', label: 'Asset Request', description: 'Request company assets or equipment' },
  { type: 'resignation', label: 'Resignation', description: 'Submit your resignation' },
  { type: 'covering', label: 'Covering Request', description: 'Apply for covering request' },
]

type DateFilter = '1d' | '7d' | '1m' | 'custom' | 'all'
type DateField = 'submitted_at' | 'reviewed_at'

export function RequestsPageClient({ requests, userId }: RequestsPageClientProps) {
  const [filter, setFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [dateField, setDateField] = useState<DateField>('submitted_at')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'status' | 'submitted_at' | 'reviewed_at' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [offset, setOffset] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<any>(null)
  const [editData, setEditData] = useState('')
  const [saving, setSaving] = useState(false)
  const limit = 10

  // Filter by status, date, and search query
  const filteredRequests = useMemo(() => {
    let filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

    // Apply search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => {
        const typeConfig = REQUEST_TYPES[r.request_type]
        const typeLabel = typeConfig?.label || r.request_type
        const statusLabel = r.status
        const requestDataStr = JSON.stringify(r.request_data || {}).toLowerCase()

        return (
          typeLabel.toLowerCase().includes(query) ||
          statusLabel.toLowerCase().includes(query) ||
          requestDataStr.includes(query) ||
          r.id.toLowerCase().includes(query)
        )
      })
    }

    // Apply date filtering
    if (dateFilter !== 'all') {
      const now = new Date()
      let startDate: Date
      let endDate: Date = endOfDay(now)

      if (dateFilter === '1d') {
        startDate = startOfDay(subDays(now, 1))
      } else if (dateFilter === '7d') {
        startDate = startOfDay(subDays(now, 7))
      } else if (dateFilter === '1m') {
        startDate = startOfDay(subMonths(now, 1))
      } else if (dateFilter === 'custom') {
        if (customStartDate && customEndDate) {
          startDate = startOfDay(new Date(customStartDate))
          endDate = endOfDay(new Date(customEndDate))
        } else {
          return filtered
        }
      } else {
        return filtered
      }

      filtered = filtered.filter(r => {
        const dateValue = dateField === 'submitted_at' ? r.submitted_at : r.reviewed_at
        if (!dateValue) return false
        const requestDate = parseISO(dateValue)
        return isWithinInterval(requestDate, { start: startDate, end: endDate })
      })
    }

    // Apply sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any
        let bValue: any

        if (sortBy === 'status') {
          aValue = a.status
          bValue = b.status
          // Compare as strings
          const comparison = aValue.localeCompare(bValue)
          return sortOrder === 'asc' ? comparison : -comparison
        } else if (sortBy === 'submitted_at' || sortBy === 'reviewed_at') {
          aValue = a[sortBy]
          bValue = b[sortBy]

          // Handle null dates (put them at the end)
          if (!aValue && !bValue) return 0
          if (!aValue) return 1
          if (!bValue) return -1

          // Compare dates
          const dateA = new Date(aValue).getTime()
          const dateB = new Date(bValue).getTime()
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
        }

        return 0
      })
    }

    return filtered
  }, [requests, filter, dateFilter, dateField, customStartDate, customEndDate, searchQuery, sortBy, sortOrder])

  // Paginate filtered requests
  const paginatedRequests = filteredRequests.slice(offset, offset + limit)
  const totalPages = Math.ceil(filteredRequests.length / limit)
  const currentPage = Math.floor(offset / limit) + 1

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    setOffset(0)
  }

  const handleDateFilterChange = (newDateFilter: DateFilter) => {
    setDateFilter(newDateFilter)
    setOffset(0)
  }

  const handleSort = (field: 'status' | 'submitted_at' | 'reviewed_at') => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new sort field with default descending order
      setSortBy(field)
      setSortOrder('desc')
    }
    setOffset(0)
  }

  const handleDeleteClick = (requestId: string) => {
    setRequestToDelete(requestId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return

    setDeleting(requestToDelete)
    try {
      const response = await fetch(`/api/requests/${requestToDelete}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete request')
      }

      toast.success('Request deleted successfully')
      setDeleteDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete request')
    } finally {
      setDeleting(null)
      setRequestToDelete(null)
    }
  }

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request)
    setDetailsDialogOpen(true)
  }

  const handleEditClick = (request: any) => {
    setEditingRequest(request)
    setEditData(JSON.stringify(request.request_data || {}, null, 2))
    setEditDialogOpen(true)
  }

  // Helper to render all request details in a structured way based on request type
  const renderAllRequestDetails = (request: any) => {
    if (!request.request_data) return []

    const data = request.request_data
    const details: { label: string; value: any; highlight?: boolean }[] = []

    switch (request.request_type) {
      case 'leave':
        if (data.leave_type) details.push({ label: 'Leave Type', value: data.leave_type })
        if (data.leave_duration) details.push({ label: 'Leave Duration', value: data.leave_duration.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) })
        if (data.start_date) details.push({ label: 'Start Date', value: format(new Date(data.start_date), 'MMMM dd, yyyy'), highlight: true })
        if (data.end_date) details.push({ label: 'End Date', value: format(new Date(data.end_date), 'MMMM dd, yyyy'), highlight: true })
        if (data.start_time) details.push({ label: 'Start Time', value: data.start_time })
        if (data.end_time) details.push({ label: 'End Time', value: data.end_time })
        if (data.check_in_time) details.push({ label: 'Check-in Time', value: data.check_in_time })
        if (data.check_out_time) details.push({ label: 'Check-out Time', value: data.check_out_time })
        if (data.duration) details.push({ label: 'Duration', value: `${data.duration} day(s)`, highlight: true })
        if (data.reason) details.push({ label: 'Reason', value: data.reason })
        if (data.description) details.push({ label: 'Description', value: data.description })
        if (data.comments) details.push({ label: 'Comments', value: data.comments })
        // Add any other fields that might exist
        Object.keys(data).forEach(key => {
          if (!['leave_type', 'leave_duration', 'start_date', 'end_date', 'start_time', 'end_time', 'check_in_time', 'check_out_time', 'duration', 'reason', 'description', 'comments'].includes(key)) {
            details.push({ label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: String(data[key]) })
          }
        })
        break

      case 'overtime':
        if (data.date) details.push({ label: 'Date', value: format(new Date(data.date), 'MMMM dd, yyyy'), highlight: true })
        if (data.start_time) details.push({ label: 'Start Time', value: data.start_time })
        if (data.end_time) details.push({ label: 'End Time', value: data.end_time })
        if (data.hours) details.push({ label: 'Hours', value: `${data.hours} hour(s)`, highlight: true })
        if (data.reason) details.push({ label: 'Reason', value: data.reason })
        break

      case 'travel_request':
        if (data.destination) details.push({ label: 'Destination', value: data.destination, highlight: true })
        if (data.start_date) details.push({ label: 'Start Date', value: format(new Date(data.start_date), 'MMMM dd, yyyy') })
        if (data.end_date) details.push({ label: 'End Date', value: format(new Date(data.end_date), 'MMMM dd, yyyy') })
        if (data.check_out_time) details.push({ label: 'Check-Out Time', value: data.check_out_time })
        if (data.check_in_time) details.push({ label: 'Check-In Time', value: data.check_in_time })
        if (data.purpose) details.push({ label: 'Purpose', value: data.purpose })
        if (data.estimated_cost) details.push({ label: 'Estimated Cost', value: `$${data.estimated_cost}` })
        if (data.transport_mode) details.push({ label: 'Transport Mode', value: data.transport_mode })
        break

      case 'expense_reimbursement':
        if (data.expense_type) details.push({ label: 'Expense Type', value: data.expense_type })
        if (data.amount) details.push({ label: 'Amount', value: `$${data.amount}`, highlight: true })
        if (data.date) details.push({ label: 'Date', value: format(new Date(data.date), 'MMMM dd, yyyy') })
        if (data.description) details.push({ label: 'Description', value: data.description })
        if (data.receipt_url) details.push({ label: 'Receipt', value: 'Attached' })
        break

      case 'attendance_regularization':
        if (data.date) details.push({ label: 'Date', value: format(new Date(data.date), 'MMMM dd, yyyy'), highlight: true })
        if (data.actual_in_time) details.push({ label: 'Actual In Time', value: data.actual_in_time })
        if (data.actual_out_time) details.push({ label: 'Actual Out Time', value: data.actual_out_time })
        if (data.requested_in_time) details.push({ label: 'Requested In Time', value: data.requested_in_time })
        if (data.requested_out_time) details.push({ label: 'Requested Out Time', value: data.requested_out_time })
        if (data.reason) details.push({ label: 'Reason', value: data.reason })
        break

      case 'asset_request':
        if (data.asset_type) details.push({ label: 'Asset Type', value: data.asset_type, highlight: true })
        if (data.quantity) details.push({ label: 'Quantity', value: data.quantity })
        if (data.purpose) details.push({ label: 'Purpose', value: data.purpose })
        if (data.urgency) details.push({ label: 'Urgency', value: data.urgency })
        if (data.expected_return_date) details.push({ label: 'Expected Return Date', value: format(new Date(data.expected_return_date), 'MMMM dd, yyyy') })
        break

      case 'resignation':
        if (data.resignation_date) details.push({ label: 'Resignation Date', value: format(new Date(data.resignation_date), 'MMMM dd, yyyy'), highlight: true })
        if (data.last_working_day) details.push({ label: 'Last Working Day', value: format(new Date(data.last_working_day), 'MMMM dd, yyyy'), highlight: true })
        if (data.notice_period) details.push({ label: 'Notice Period', value: `${data.notice_period} days` })
        if (data.reason) details.push({ label: 'Reason', value: data.reason })
        break

      case 'document_request':
        if (data.document_type) details.push({ label: 'Document Type', value: data.document_type, highlight: true })
        if (data.purpose) details.push({ label: 'Purpose', value: data.purpose })
        if (data.urgency) details.push({ label: 'Urgency', value: data.urgency })
        break

      case 'covering':
        if (data.covered_employee) details.push({ label: 'Covering For', value: data.covered_employee, highlight: true })
        if (data.start_date) details.push({ label: 'Start Date', value: format(new Date(data.start_date), 'MMMM dd, yyyy') })
        if (data.end_date) details.push({ label: 'End Date', value: format(new Date(data.end_date), 'MMMM dd, yyyy') })
        if (data.reason) details.push({ label: 'Reason', value: data.reason })
        break

      default:
        // Generic fallback for unknown request types
        Object.entries(data).forEach(([key, value]) => {
          details.push({
            label: key.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
            value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
          })
        })
    }

    return details
  }

  const handleEditSubmit = async () => {
    if (!editingRequest) return

    setSaving(true)
    try {
      let parsedData
      try {
        parsedData = JSON.parse(editData)
      } catch (e) {
        toast.error('Invalid JSON format')
        setSaving(false)
        return
      }

      const response = await fetch(`/api/requests/${editingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_data: parsedData })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update request')
      }

      toast.success('Request updated successfully')
      setEditDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update request')
    } finally {
      setSaving(false)
    }
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

  const formatLeaveDetails = (requestData: any) => {
    if (!requestData) return null

    const { leave_duration, start_time, end_time, start_date, end_date } = requestData

    let durationText = ''
    if (start_date === end_date) {
      if (leave_duration === 'half_day_morning') {
        durationText = '0.5 days (Half Day - Morning)'
      } else if (leave_duration === 'half_day_afternoon') {
        durationText = '0.5 days (Half Day - Afternoon)'
      } else if (leave_duration === 'custom_time' && start_time && end_time) {
        durationText = `Custom Time: ${start_time} - ${end_time}`
      } else {
        durationText = '1 day (Full Day)'
      }
    } else {
      const start = new Date(start_date)
      const end = new Date(end_date)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      durationText = `${daysDiff} days`

      if (start_time || end_time) {
        durationText += ' (with custom times)'
      }
    }

    return {
      duration: durationText,
      hasCustomTime: leave_duration === 'custom_time' || start_time || end_time,
      startTime: start_time,
      endTime: end_time,
      isHalfDay: leave_duration?.includes('half_day')
    }
  }

  const formatTravelDetails = (requestData: any) => {
    if (!requestData) return null

    const { check_out_time, check_in_time, destination } = requestData

    return {
      hasTime: !!(check_out_time || check_in_time),
      checkOutTime: check_out_time,
      checkInTime: check_in_time,
      destination: destination
    }
  }


  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-gray-500 mt-1">Manage all your requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
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
        <Card>
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

      {/* New Request Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {REQUEST_LINKS.map((link) => (
              <Link key={link.type} href={`/requests/new/${link.type}`}>
                <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer h-full">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{link.label}</h3>
                    <p className="text-sm text-gray-500">{link.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          {/* All Filters in One Line */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setOffset(0)
                }}
                className="pl-10"
              />
            </div>

            {/* Status Filter Dropdown */}
            <Select value={filter} onValueChange={(value) => handleFilterChange(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By Dropdown */}
            {/* <Select 
              value={sortBy || 'none'} 
              onValueChange={(value) => {
                if (value === 'none') {
                  setSortBy(null)
                  setOffset(0)
                } else {
                  handleSort(value as 'status' | 'submitted_at' | 'reviewed_at')
                }
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Sorting</SelectItem>
                <SelectItem value="status">Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</SelectItem>
                <SelectItem value="submitted_at">Submit Date {sortBy === 'submitted_at' && (sortOrder === 'asc' ? '↑' : '↓')}</SelectItem>
                <SelectItem value="reviewed_at">Review Date {sortBy === 'reviewed_at' && (sortOrder === 'asc' ? '↑' : '↓')}</SelectItem>
              </SelectContent>
            </Select> */}

            {/* Date Field Selector */}
            <Select value={dateField} onValueChange={(value: DateField) => setDateField(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_at">Submit Date</SelectItem>
                <SelectItem value="reviewed_at">Review Date</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={dateFilter} onValueChange={(value: DateFilter) => handleDateFilterChange(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[150px]"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[150px]"
                  placeholder="To"
                />
              </>
            )}

            {/* Clear All Filters Button */}
            {(searchQuery || filter !== 'all' || sortBy || dateFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilter('all')
                  setSortBy(null)
                  setDateFilter('all')
                  setCustomStartDate('')
                  setCustomEndDate('')
                  setOffset(0)
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>My Requests</span>
            <span className="text-sm font-normal text-gray-500">
              Showing {Math.min(offset + limit, filteredRequests.length)} of {filteredRequests.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No requests found</p>
              {(dateFilter !== 'all' || filter !== 'all' || searchQuery) && (
                <p className="text-sm mt-2">Try adjusting your filters or search query</p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Reviewed Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((request) => {
                    const typeConfig = REQUEST_TYPES[request.request_type] || { label: request.request_type, icon: FileText, color: 'gray' }
                    const Icon = typeConfig.icon

                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <span className="text-sm font-medium">{typeConfig.label}</span>
                              {request.request_type === 'leave' && request.request_data && (() => {
                                const leaveDetails = formatLeaveDetails(request.request_data)
                                return leaveDetails && (
                                  <p className="text-xs text-gray-500 mt-0.5">{leaveDetails.duration}</p>
                                )
                              })()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDateTime(request.submitted_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {request.reviewed_at ? formatDateTime(request.reviewed_at) : '-'}
                          </span>
                        </TableCell>
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
                              {request.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditClick(request)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(request.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 border-t pt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setOffset(Math.max(0, offset - limit))
                          }}
                          className={offset === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          )
                        })
                        .map((page, index, array) => (
                          <span key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault()
                                  setOffset((page - 1) * limit)
                                }}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </span>
                        ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setOffset(Math.min((totalPages - 1) * limit, offset + limit))
                          }}
                          className={offset + limit >= filteredRequests.length ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const typeConfig = REQUEST_TYPES[selectedRequest.request_type] || { label: selectedRequest.request_type, icon: FileText, color: 'gray' }
                    const Icon = typeConfig.icon
                    return (
                      <>
                        <Icon className="w-5 h-5" />
                        {typeConfig.label} Request
                      </>
                    )
                  })()}
                </DialogTitle>
                <DialogDescription>
                  Request ID: {selectedRequest.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Complete Record Information */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-3">Record Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Request Type</p>
                      <p className="font-medium">
                        {REQUEST_TYPES[selectedRequest.request_type]?.label || selectedRequest.request_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Request ID</p>
                      <p className="font-medium font-mono text-xs">{selectedRequest.id.slice(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Submitted On</p>
                      <p className="font-medium">{formatDateTime(selectedRequest.submitted_at)}</p>
                    </div>
                    {selectedRequest.reviewed_at && (
                      <div>
                        <p className="text-gray-500 text-xs">Reviewed On</p>
                        <p className="font-medium">{formatDateTime(selectedRequest.reviewed_at)}</p>
                      </div>
                    )}
                    {selectedRequest.reviewer && (
                      <div>
                        <p className="text-gray-500 text-xs">Reviewed By</p>
                        <p className="font-medium">{selectedRequest.reviewer.full_name}</p>
                      </div>
                    )}
                    {selectedRequest.created_at && (
                      <div>
                        <p className="text-gray-500 text-xs">Created At</p>
                        <p className="font-medium text-xs">{formatDateTime(selectedRequest.created_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {selectedRequest.review_notes && (
                  <>
                    <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
                      <h4 className="font-semibold mb-2 text-sm">Review Notes</h4>
                      <p className="text-sm italic bg-white dark:bg-gray-900 p-2 rounded">&quot;{selectedRequest.review_notes}&quot;</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Remove old leave/travel specific sections since they're now in renderAllRequestDetails */}



                {/* Request Details - Structured Display */}
                <Separator />
                {selectedRequest.request_data && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-500">Request Information</p>
                    <div className="space-y-2.5">
                      {renderAllRequestDetails(selectedRequest).map((detail, idx) => (
                        <div key={idx} className={`border-b last:border-0 pb-2.5 last:pb-0 ${detail.highlight ? 'bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded -mx-1' : ''}`}>
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

                <div className="flex gap-2 pt-4 border-t">
                  {selectedRequest.status === 'pending' && (
                    <Button
                      onClick={() => {
                        setDetailsDialogOpen(false)
                        handleEditClick(selectedRequest)
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Request
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setDetailsDialogOpen(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          {editingRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit {REQUEST_TYPES[editingRequest.request_type]?.label || 'Request'}
                </DialogTitle>
                <DialogDescription>
                  Update the request details below. JSON format required.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="edit-data" className="text-sm font-medium mb-2 block">
                    Request Data (JSON)
                  </Label>
                  <Textarea
                    id="edit-data"
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                    className="font-mono text-sm min-h-[300px]"
                    placeholder='{"key": "value"}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Edit the JSON data above. Make sure it's valid JSON format.
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleEditSubmit}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting !== null}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
