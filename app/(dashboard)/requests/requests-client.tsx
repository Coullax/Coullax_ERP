'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
import { Textarea } from '@/components/ui/textarea'
import { Plus, FileText, Clock, CheckCircle, XCircle, Calendar, CalendarDays, Trash2, Edit, Eye } from 'lucide-react'
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
]

type DateFilter = '1d' | '7d' | '1m' | 'custom' | 'all'
type DateField = 'submitted_at' | 'reviewed_at'

export function RequestsPageClient({ requests, userId }: RequestsPageClientProps) {
  const [filter, setFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [dateField, setDateField] = useState<DateField>('submitted_at')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<any>(null)
  const [editData, setEditData] = useState('')
  const [saving, setSaving] = useState(false)
  const itemsPerPage = 10

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

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredRequests.slice(startIndex, endIndex)
  }, [filteredRequests, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const handleDateFilterChange = (newDateFilter: DateFilter) => {
    setDateFilter(newDateFilter)
    setCurrentPage(1)
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
      // Refresh the page to update the list
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
      // Parse the JSON data
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
      // Refresh the page to update the list
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update request')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending' },
      approved: { variant: 'success', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    }
    const config = variants[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
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
          <h1 className="text-3xl font-bold">Requests</h1>
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
                <Card className="hover:shadow-card-hover transition-shadow cursor-pointer h-full">
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

      {/* Filter Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
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
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Requests</CardTitle>
            <p className="text-sm text-gray-500">
              Showing {paginatedRequests.length} of {filteredRequests.length} requests
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No requests found</p>
              {(dateFilter !== 'all' || filter !== 'all') && (
                <p className="text-sm mt-2">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedRequests.map((request) => {
                const typeConfig = REQUEST_TYPES[request.request_type] || { label: request.request_type, icon: FileText, color: 'gray' }
                const Icon = typeConfig.icon

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(request)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{typeConfig.label}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Submitted on {formatDateTime(request.submitted_at)}
                          </p>
                          {request.reviewed_at && (
                            <p className="text-sm text-gray-500">
                              Reviewed on {formatDateTime(request.reviewed_at)}
                              {request.reviewer && ` by ${request.reviewer.full_name}`}
                            </p>
                          )}
                          {request.review_notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                              &quot;{request.review_notes}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {getStatusBadge(request.status)}
                        {request.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(request)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(request.id)}
                              disabled={deleting === request.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

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
                        setCurrentPage(prev => Math.max(1, prev - 1))
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
                              setCurrentPage(page)
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
                        setCurrentPage(prev => Math.min(totalPages, prev + 1))
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
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
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
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
              disabled={!!deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
