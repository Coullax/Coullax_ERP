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
import { Plus, FileText, Clock, CheckCircle, XCircle, Calendar, CalendarDays, Trash2, Edit, Eye, MoreHorizontal, Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { subDays, subMonths, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns'
import { Label } from '@/components/ui/label'

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

  // Filter by status and date
  const filteredRequests = useMemo(() => {
    let filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

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

    return filtered
  }, [requests, filter, dateFilter, dateField, customStartDate, customEndDate])

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
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
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
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium flex items-center mr-2">Status:</span>
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                onClick={() => handleFilterChange(status)}
                className="capitalize"
                size="sm"
              >
                {status}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium flex items-center mr-2">
              <CalendarDays className="w-4 h-4 mr-2" />
              Date Range:
            </span>
            <Select value={dateField} onValueChange={(value: DateField) => setDateField(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_at">Submit Date</SelectItem>
                <SelectItem value="reviewed_at">Review Date</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={dateFilter === 'all' ? 'default' : 'outline'}
              onClick={() => handleDateFilterChange('all')}
              size="sm"
            >
              All Time
            </Button>
            <Button
              variant={dateFilter === '1d' ? 'default' : 'outline'}
              onClick={() => handleDateFilterChange('1d')}
              size="sm"
            >
              Last 24h
            </Button>
            <Button
              variant={dateFilter === '7d' ? 'default' : 'outline'}
              onClick={() => handleDateFilterChange('7d')}
              size="sm"
            >
              Last 7 Days
            </Button>
            <Button
              variant={dateFilter === '1m' ? 'default' : 'outline'}
              onClick={() => handleDateFilterChange('1m')}
              size="sm"
            >
              Last Month
            </Button>
            <Button
              variant={dateFilter === 'custom' ? 'default' : 'outline'}
              onClick={() => handleDateFilterChange('custom')}
              size="sm"
            >
              Custom Range
            </Button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex flex-wrap gap-3 items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">From:</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">To:</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          )}
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
              {(dateFilter !== 'all' || filter !== 'all') && (
                <p className="text-sm mt-2">Try adjusting your filters</p>
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
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Status</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Submitted On</p>
                    <p className="text-sm font-medium">{formatDateTime(selectedRequest.submitted_at)}</p>
                  </div>

                  {selectedRequest.reviewed_at && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Reviewed On</p>
                      <p className="text-sm font-medium">{formatDateTime(selectedRequest.reviewed_at)}</p>
                    </div>
                  )}
                </div>

                {selectedRequest.reviewer && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Reviewed By</p>
                    <p className="text-sm font-medium">{selectedRequest.reviewer.full_name}</p>
                  </div>
                )}

                {selectedRequest.review_notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Review Notes</p>
                    <p className="text-sm italic">&quot;{selectedRequest.review_notes}&quot;</p>
                  </div>
                )}

                {/* Leave Request Specific Details */}
                {selectedRequest.request_type === 'leave' && selectedRequest.request_data && (() => {
                  const leaveDetails = formatLeaveDetails(selectedRequest.request_data)
                  return leaveDetails && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg space-y-2">
                      <p className="text-xs text-blue-600 dark:text-blue-300 font-medium mb-2">Leave Details</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                          <p className="text-sm font-medium">{leaveDetails.duration}</p>
                        </div>
                        {leaveDetails.hasCustomTime && (
                          <>
                            {leaveDetails.startTime && (
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Start Time</p>
                                <p className="text-sm font-medium">{leaveDetails.startTime}</p>
                              </div>
                            )}
                            {leaveDetails.endTime && (
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">End Time</p>
                                <p className="text-sm font-medium">{leaveDetails.endTime}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })()}



                {/* Travel Request Specific Details */}
                {selectedRequest.request_type === 'travel_request' && selectedRequest.request_data && (() => {
                  const travelDetails = formatTravelDetails(selectedRequest.request_data)
                  return travelDetails && travelDetails.hasTime && (
                    <div className="p-3 bg-green-50 dark:bg-green-900 rounded-lg space-y-2">
                      <p className="text-xs text-green-600 dark:text-green-300 font-medium mb-2">Travel Details</p>
                      <div className="grid grid-cols-2 gap-3">
                        {travelDetails.checkOutTime && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Check-Out Time</p>
                            <p className="text-sm font-medium">{travelDetails.checkOutTime}</p>
                            <p className="text-xs text-gray-400">Departure time</p>
                          </div>
                        )}
                        {travelDetails.checkInTime && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Check-In Time</p>
                            <p className="text-sm font-medium">{travelDetails.checkInTime}</p>
                            <p className="text-xs text-gray-400">Return time</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}



                {selectedRequest.request_data && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Request Details</p>
                    <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                      {JSON.stringify(selectedRequest.request_data, null, 2)}
                    </pre>
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
