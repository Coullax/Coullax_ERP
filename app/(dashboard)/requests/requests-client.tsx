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
import { Plus, FileText, Clock, CheckCircle, XCircle, Calendar, CalendarDays, Trash2, Edit, Eye, MoreHorizontal, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, Upload, Download } from 'lucide-react'
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
  const [proofDialogOpen, setProofDialogOpen] = useState(false)
  const [proofRequest, setProofRequest] = useState<any>(null)
  const [attachmentType, setAttachmentType] = useState<'commit_link' | 'file_upload'>('commit_link')
  const [commitLink, setCommitLink] = useState('')
  const [coveringFiles, setCoveringFiles] = useState<string[]>([])
  const [uploadingProof, setUploadingProof] = useState(false)
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
    console.log('🔍 Request Details:', request)
    console.log('� Request Type:', request.request_type)
    console.log('�📊 Overtime Requests:', request.overtime_requests)
    console.log('✈️ Travel Requests:', request.travel_requests)
    console.log('📋 Leave Requests:', request.leave_requests)
    setSelectedRequest(request)
    setDetailsDialogOpen(true)
  }

  const handleViewProof = (request: any) => {
    setProofRequest(request)
    setProofDialogOpen(true)
    setAttachmentType('commit_link')
    setCommitLink('')
    setCoveringFiles([])
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
        if (data.leave_duration) details.push({ label: 'Leave Duration', value: String(data.leave_duration).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) })
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
          if (travelData.check_out_time) details.push({ label: 'Check-Out Time', value: travelData.check_out_time })
          if (travelData.check_in_time) details.push({ label: 'Check-In Time', value: travelData.check_in_time })
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

      case 'request_for_covering':
        if (data.covering_date) details.push({ label: 'Covering Date', value: format(new Date(data.covering_date), 'MMMM dd, yyyy'), highlight: true })
        if (data.start_time) details.push({ label: 'Start Time', value: data.start_time })
        if (data.end_time) details.push({ label: 'End Time', value: data.end_time })
        break

      default:
        // Generic fallback for unknown request types
        Object.entries(data).forEach(([key, value]) => {
          details.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
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

  const handleProofSubmit = async () => {
    if (!proofRequest) return

    // Validation
    if (attachmentType === 'commit_link' && !commitLink.trim()) {
      toast.error('Please provide a commit link')
      return
    }
    if (attachmentType === 'file_upload' && coveringFiles.length === 0) {
      toast.error('Please upload at least one file')
      return
    }

    setUploadingProof(true)
    try {
      const { employeeSubmitCoveringProof } = await import('@/app/actions/request-actions')

      await employeeSubmitCoveringProof(proofRequest.id, userId, {
        attachment_type: attachmentType,
        commit_link: attachmentType === 'commit_link' ? commitLink : undefined,
        covering_files: attachmentType === 'file_upload' ? coveringFiles : undefined,
      })

      toast.success('Proof submitted successfully!')
      setProofDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit proof')
    } finally {
      setUploadingProof(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingProof(true)
    try {
      const { uploadToB2 } = await import('@/app/actions/upload-actions')

      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const timestamp = Date.now()
        const uniqueFilename = `covering/${userId}/${timestamp}_${file.name}`
        formData.append('filename', uniqueFilename)

        const result = await uploadToB2(formData)
        if (!result.success) {
          throw new Error(result.error || 'Upload failed')
        }
        return result.publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      const validUrls = uploadedUrls.filter((url): url is string => url !== undefined)
      setCoveringFiles([...coveringFiles, ...validUrls])
      toast.success(`${uploadedUrls.length} file(s) uploaded successfully!`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files')
    } finally {
      setUploadingProof(false)
    }
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
    awaiting_proof_submission: requests.filter(r => r.status === 'awaiting_proof_submission').length,
    team_leader_approval_pending: requests.filter(r => r.status === 'team_leader_approval_pending').length,
    admin_approval_pending: requests.filter(r => r.status === 'admin_approval_pending').length,
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
          <CardContent className="p-6 relative" onClick={() => handleFilterChange('awaiting_proof_submission')}>
            {stats.awaiting_proof_submission > 0 && (
              <>
                <div className=' bg-red-500 absolute top-0 right-0 w-2.5 h-2.5 rounded-full'></div>
                <div className=' bg-red-500 absolute top-0 right-0 w-2.5 h-2.5 rounded-full animate-ping'></div>
              </>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Proof Submissions</p>
                <p className="text-2xl font-bold">{stats.awaiting_proof_submission}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6" onClick={() => handleFilterChange('team_leader_approval_pending')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending team approval</p>
                <p className="text-2xl font-bold">{stats.team_leader_approval_pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6" onClick={() => handleFilterChange('approved')}>
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
          <CardContent className="p-6" onClick={() => handleFilterChange('rejected')}>
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
          <CardTitle className="text-lg">
            <div className="flex items-center justify-between mb-4">
              <span>My Requests</span>
              <span className="text-sm font-normal text-gray-500">
                Showing {Math.min(offset + limit, filteredRequests.length)} of {filteredRequests.length}
              </span>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('all')}
                className="flex items-center gap-2"
              >
                All
              </Button>
              <Button
                variant={filter === 'team_leader_approval_pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  handleFilterChange('team_leader_approval_pending')
                  setOffset(0)
                }}
                className="gap-1"
              >
                Team Lead Approval Pending
              </Button>
              <Button
                variant={filter === 'admin_approval_pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('admin_approval_pending')}
                className="flex items-center gap-2"
              >
                Admin Approval Pending
              </Button>
              <Button
                variant={filter === 'awaiting_proof_submission' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('awaiting_proof_submission')}
                className="flex items-center gap-2 relative"
              >
                Awaiting Proof Submission
                {stats.awaiting_proof_submission > 0 && (
                  <>
                    <div className=' bg-red-500 absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full'></div>
                    <div className=' bg-red-500 absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-ping'></div>
                  </>
                )}
              </Button>
              <Button
                variant={filter === 'proof_verification_pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('proof_verification_pending')}
                className="flex items-center gap-2"
              >
                Proof Verification Pending
              </Button>
              <Button
                variant={filter === 'admin_final_approval_pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('admin_final_approval_pending')}
                className="flex items-center gap-2"
              >
                Admin Final Approval Pending
              </Button>

              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('approved')}
                className="flex items-center gap-2"
              >
                Approved
              </Button>

              <Button
                variant={filter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('rejected')}
                className="flex items-center gap-2"
              >
                Rejected
              </Button>
            </div>
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
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                                {request.status === 'awaiting_proof_submission' && (
                                  <>
                                    <div className=' bg-red-500 absolute top-0 right-0 rounded-full h-2 w-2 aspect-square'></div>
                                    <div className=' bg-red-500 absolute top-0 right-0 rounded-full h-2 w-2 aspect-square animate-ping'></div>
                                  </>
                                )}
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(request)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {request.status === 'awaiting_proof_submission' && (
                                <DropdownMenuItem onClick={() => handleViewProof(request)} >
                                  <>
                                    <div className=' bg-red-500 absolute top-0 right-0 rounded-full h-2 w-2 aspect-square'></div>
                                    <div className=' bg-red-500 absolute top-0 right-0 rounded-full h-2 w-2 aspect-square animate-ping'></div>
                                  </>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Submit Proof
                                </DropdownMenuItem>
                              )}
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
                {/* Leave Request Specific Details */}
                {selectedRequest.request_type === 'leave' && selectedRequest.leave_requests && (() => {
                  const leaveData = Array.isArray(selectedRequest.leave_requests)
                    ? selectedRequest.leave_requests[0]
                    : selectedRequest.leave_requests

                  if (!leaveData) return null

                  return (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg space-y-3">
                      <p className="text-sm text-blue-600 dark:text-blue-300 font-semibold mb-3">Leave Request Details</p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Leave Type</p>
                          <p className="text-sm font-medium capitalize">{leaveData.leave_type?.replace('_', ' ')}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Days</p>
                          <p className="text-sm font-medium">{leaveData.total_days} {leaveData.total_days === 1 ? 'day' : 'days'}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                          <p className="text-sm font-medium">{leaveData.start_date}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</p>
                          <p className="text-sm font-medium">{leaveData.end_date}</p>
                        </div>

                        {leaveData.leave_duration && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Leave Duration</p>
                            <p className="text-sm font-medium capitalize">
                              {leaveData.leave_duration.replace(/_/g, ' ')}
                            </p>
                          </div>
                        )}

                        {(leaveData.start_time || leaveData.end_time) && (
                          <>
                            {leaveData.start_time && (
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Time</p>
                                <p className="text-sm font-medium">{leaveData.start_time}</p>
                              </div>
                            )}
                            {leaveData.end_time && (
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Time</p>
                                <p className="text-sm font-medium">{leaveData.end_time}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {leaveData.reason && (
                        <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                          <p className="text-sm">{leaveData.reason}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Overtime Request Specific Details */}
                {selectedRequest.request_type === 'overtime' && selectedRequest.overtime_requests && (() => {
                  const overtimeData = Array.isArray(selectedRequest.overtime_requests)
                    ? selectedRequest.overtime_requests[0]
                    : selectedRequest.overtime_requests

                  if (!overtimeData) return null

                  return (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg space-y-3">
                      <p className="text-sm text-orange-600 dark:text-orange-300 font-semibold mb-3">Overtime Request Details</p>

                      <div className="grid grid-cols-2 gap-4">
                        {overtimeData.date && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                            <p className="text-sm font-medium">{new Date(overtimeData.date).toLocaleDateString()}</p>
                          </div>
                        )}

                        {overtimeData.hours && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hours</p>
                            <p className="text-sm font-medium">{overtimeData.hours} {overtimeData.hours === 1 ? 'hour' : 'hours'}</p>
                          </div>
                        )}

                        {overtimeData.start_time && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Time</p>
                            <p className="text-sm font-medium">{overtimeData.start_time}</p>
                          </div>
                        )}

                        {overtimeData.end_time && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Time</p>
                            <p className="text-sm font-medium">{overtimeData.end_time}</p>
                          </div>
                        )}

                        {overtimeData.assigned_supervisor && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned Supervisor</p>
                            <p className="text-sm font-medium">{overtimeData.assigned_supervisor}</p>
                          </div>
                        )}
                      </div>

                      {overtimeData.reason && (
                        <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                          <p className="text-sm">{overtimeData.reason}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Travel Request Specific Details */}
                {selectedRequest.request_type === 'travel_request' && selectedRequest.travel_requests && (() => {
                  const travelData = Array.isArray(selectedRequest.travel_requests)
                    ? selectedRequest.travel_requests[0]
                    : selectedRequest.travel_requests

                  if (!travelData) return null

                  return (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg space-y-3">
                      <p className="text-sm text-purple-600 dark:text-purple-300 font-semibold mb-3">Travel Request Details</p>

                      <div className="grid grid-cols-2 gap-4">
                        {travelData.destination && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Destination</p>
                            <p className="text-sm font-medium">{travelData.destination}</p>
                          </div>
                        )}

                        {travelData.start_date && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                            <p className="text-sm font-medium">{new Date(travelData.start_date).toLocaleDateString()}</p>
                          </div>
                        )}

                        {travelData.end_date && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</p>
                            <p className="text-sm font-medium">{new Date(travelData.end_date).toLocaleDateString()}</p>
                          </div>
                        )}

                        {travelData.check_out_time && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-Out Time</p>
                            <p className="text-sm font-medium">{travelData.check_out_time}</p>
                          </div>
                        )}

                        {travelData.check_in_time && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-In Time</p>
                            <p className="text-sm font-medium">{travelData.check_in_time}</p>
                          </div>
                        )}

                        {travelData.estimated_cost && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Cost</p>
                            <p className="text-sm font-medium">${travelData.estimated_cost}</p>
                          </div>
                        )}

                        {travelData.transport_mode && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transport Mode</p>
                            <p className="text-sm font-medium capitalize">{travelData.transport_mode}</p>
                          </div>
                        )}
                      </div>

                      {travelData.purpose && (
                        <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Purpose</p>
                          <p className="text-sm">{travelData.purpose}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Expense Reimbursement Specific Details */}
                {selectedRequest.request_type === 'expense_reimbursement' && selectedRequest.expense_reimbursements && (() => {
                  const expenseData = Array.isArray(selectedRequest.expense_reimbursements)
                    ? selectedRequest.expense_reimbursements[0]
                    : selectedRequest.expense_reimbursements

                  if (!expenseData) return null

                  return (
                    <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg space-y-3">
                      <p className="text-sm text-green-600 dark:text-green-300 font-semibold mb-3">Expense Reimbursement Details</p>

                      <div className="grid grid-cols-2 gap-4">
                        {expenseData.expense_type && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expense Type</p>
                            <p className="text-sm font-medium capitalize">{expenseData.expense_type.replace(/_/g, ' ')}</p>
                          </div>
                        )}

                        {expenseData.amount && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</p>
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">${expenseData.amount}</p>
                          </div>
                        )}

                        {expenseData.expense_date && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expense Date</p>
                            <p className="text-sm font-medium">{new Date(expenseData.expense_date).toLocaleDateString()}</p>
                          </div>
                        )}

                        {expenseData.attachments && expenseData.attachments.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Attachments ({expenseData.attachments.length})</p>
                            <div className="space-y-1">
                              {expenseData.attachments.map((url: string, index: number) => {
                                const fileName = url.split('/').pop() || `attachment-${index + 1}`
                                return (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    {fileName}
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {expenseData.description && (
                        <div className="pt-2 border-t border-green-200 dark:border-green-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                          <p className="text-sm">{expenseData.description}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Attendance Regularization Specific Details */}
                {selectedRequest.request_type === 'attendance_regularization' && selectedRequest.attendance_regularization_requests && (() => {
                  const attendanceData = Array.isArray(selectedRequest.attendance_regularization_requests)
                    ? selectedRequest.attendance_regularization_requests[0]
                    : selectedRequest.attendance_regularization_requests

                  if (!attendanceData) return null

                  return (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900 rounded-lg space-y-3">
                      <p className="text-sm text-indigo-600 dark:text-indigo-300 font-semibold mb-3">Attendance Regularization Details</p>

                      <div className="grid grid-cols-2 gap-4">
                        {attendanceData.date && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                            <p className="text-sm font-medium">{new Date(attendanceData.date).toLocaleDateString()}</p>
                          </div>
                        )}

                        {attendanceData.actual_time && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Time</p>
                            <p className="text-sm font-medium">{attendanceData.actual_time}</p>
                          </div>
                        )}

                        {attendanceData.requested_time && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Requested Time</p>
                            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{attendanceData.requested_time}</p>
                          </div>
                        )}
                      </div>

                      {attendanceData.reason && (
                        <div className="pt-2 border-t border-indigo-200 dark:border-indigo-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                          <p className="text-sm">{attendanceData.reason}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Asset Request Specific Details */}
                {selectedRequest.request_type === 'asset_request' && selectedRequest.asset_requests && (() => {
                  const assetData = Array.isArray(selectedRequest.asset_requests)
                    ? selectedRequest.asset_requests[0]
                    : selectedRequest.asset_requests

                  if (!assetData) return null

                  return (
                    <div className="p-4 bg-teal-50 dark:bg-teal-900 rounded-lg space-y-3">
                      <p className="text-sm text-teal-600 dark:text-teal-300 font-semibold mb-3">Asset Request Details</p>

                      <div className="grid grid-cols-2 gap-4">
                        {assetData.asset_type && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Asset Type</p>
                            <p className="text-sm font-medium capitalize">{assetData.asset_type.replace(/_/g, ' ')}</p>
                          </div>
                        )}

                        {assetData.quantity && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                            <p className="text-sm font-medium text-teal-700 dark:text-teal-300">{assetData.quantity}</p>
                          </div>
                        )}

                        {assetData.asset_specification && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Specification</p>
                            <p className="text-sm font-medium">{assetData.asset_specification}</p>
                          </div>
                        )}
                      </div>

                      {assetData.reason && (
                        <div className="pt-2 border-t border-teal-200 dark:border-teal-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                          <p className="text-sm">{assetData.reason}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Asset Issue Request Specific Details */}
                {selectedRequest.asset_issue_requests && (() => {
                  const assetIssueData = Array.isArray(selectedRequest.asset_issue_requests)
                    ? selectedRequest.asset_issue_requests[0]
                    : selectedRequest.asset_issue_requests

                  if (!assetIssueData) return null

                  return (
                    <div className="p-4 bg-rose-50 dark:bg-rose-900 rounded-lg space-y-3">
                      <p className="text-sm text-rose-600 dark:text-rose-300 font-semibold mb-3">Asset Issue Report Details</p>

                      <div className="grid grid-cols-2 gap-4">
                        {assetIssueData.issue_quantity && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Issue Quantity</p>
                            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{assetIssueData.issue_quantity}</p>
                          </div>
                        )}

                        {assetIssueData.requested_action && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Requested Action</p>
                            <p className="text-sm font-medium capitalize">{assetIssueData.requested_action}</p>
                          </div>
                        )}

                        {assetIssueData.issue_description && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Issue Description</p>
                            <p className="text-sm font-medium">{assetIssueData.issue_description}</p>
                          </div>
                        )}

                        {assetIssueData.issue_image_url && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Issue Image</p>
                            <img
                              src={assetIssueData.issue_image_url}
                              alt="Asset Issue"
                              className="rounded-lg border border-rose-200 dark:border-rose-700 max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(assetIssueData.issue_image_url, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Resignation Request Specific Details */}
                {selectedRequest.request_type === 'resignation' && selectedRequest.resignations && (() => {
                  const resignationData = Array.isArray(selectedRequest.resignations)
                    ? selectedRequest.resignations[0]
                    : selectedRequest.resignations

                  if (!resignationData) return null

                  return (
                    <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg space-y-3">
                      <p className="text-sm text-red-600 dark:text-red-300 font-semibold mb-3">Resignation Request Details</p>

                      <div className="grid grid-cols-2 gap-4">
                        {resignationData.resignation_date && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resignation Date</p>
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">{new Date(resignationData.resignation_date).toLocaleDateString()}</p>
                          </div>
                        )}

                        {resignationData.notice_period_days && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notice Period</p>
                            <p className="text-sm font-medium">{resignationData.notice_period_days} days</p>
                          </div>
                        )}

                        {resignationData.last_working_date && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Working Day</p>
                            <p className="text-sm font-medium">{new Date(resignationData.last_working_date).toLocaleDateString()}</p>
                          </div>
                        )}

                        {resignationData.document_url && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resignation Document</p>
                            <a
                              href={resignationData.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              View Document
                            </a>
                          </div>
                        )}
                      </div>

                      {resignationData.reason && (
                        <div className="pt-2 border-t border-red-200 dark:border-red-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</p>
                          <p className="text-sm">{resignationData.reason}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {selectedRequest.request_data && (<Separator />)}


                {/* Request Details - Structured Display */}
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

                {/* Record Information for Non-Covering Requests */}
                {selectedRequest.request_type !== 'covering' && (
                  <>
                    <Separator />
                    <div className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-900 rounded-lg p-4">
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
                      </div>
                    </div>
                  </>
                )}

                {/* Covering Request Specific Details */}
                {selectedRequest.request_type === 'covering' && selectedRequest.covering_requests?.[0] && (
                  <>
                    {/* <Separator /> */}
                    <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                      <h4 className="font-semibold mb-3">Covering Request Details</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-gray-500 text-xs">Covering Date</p>
                          <p className="font-medium text-sm">{new Date(selectedRequest.covering_requests[0].covering_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Start Time</p>
                          <p className="font-medium text-sm">{selectedRequest.covering_requests[0].start_time}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">End Time</p>
                          <p className="font-medium text-sm">{selectedRequest.covering_requests[0].end_time}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Covering Hours</p>
                          <p className="font-medium text-sm">
                            {(() => {
                              const start = selectedRequest.covering_requests[0].start_time.split(':')
                              const end = selectedRequest.covering_requests[0].end_time.split(':')
                              const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1])
                              const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1])
                              return ((endMinutes - startMinutes) / 60).toFixed(1)
                            })()} hours
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Status</p>
                          <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                        </div>
                        {selectedRequest.covering_requests[0].work_description && (
                          <div className="col-span-2">
                            <p className="text-gray-500 text-xs">Task Description</p>
                            <p className="font-medium text-sm">{selectedRequest.covering_requests[0].work_description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Proof Preview */}
                    {(selectedRequest.status === 'proof_verification_pending' || selectedRequest.status === 'admin_final_approval_pending' || selectedRequest.status === 'approved') && (
                      <>
                        <Separator />
                        <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-900">
                          <h4 className="font-semibold mb-3">Submitted Proof</h4>
                          <div className="space-y-3">
                            {selectedRequest.covering_requests[0].attachment_type === 'commit_link' && selectedRequest.covering_requests[0].commit_link && (
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

                            {selectedRequest.covering_requests[0].attachment_type === 'file_upload' && selectedRequest.covering_requests[0].covering_files && selectedRequest.covering_requests[0].covering_files.length > 0 && (
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
                  </>
                )}

                {/* Review Information */}
                <Separator />
                {selectedRequest.reviewed_by || (selectedRequest.request_type === 'covering' && selectedRequest.covering_requests?.[0]?.verified_by) ? (
                  <div className="space-y-3">
                    {/* Team Lead Verification */}
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
                              <span className="font-medium">{new Date(selectedRequest.covering_requests[0].work_verified_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Admin Approval */}
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
                          {selectedRequest.reviewed_at && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Reviewed Date:</span>
                              <span className="font-medium">{new Date(selectedRequest.reviewed_at).toLocaleString()}</span>
                            </div>
                          )}
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

      {/* Submit Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {proofRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Submit Proof of Work
                </DialogTitle>
                <DialogDescription>
                  Submit proof for your covering request on {proofRequest.covering_requests?.[0]?.covering_date}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Attachment Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="attachment_type">Proof of Work *</Label>
                  <select
                    id="attachment_type"
                    value={attachmentType}
                    onChange={(e) => setAttachmentType(e.target.value as 'commit_link' | 'file_upload')}
                    className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="commit_link">Commit Message Link</option>
                    <option value="file_upload">Upload Files</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    {attachmentType === 'commit_link'
                      ? 'Provide a link to your GitHub commit or pull request'
                      : 'Upload files as proof of work (screenshots, documents, etc.)'}
                  </p>
                </div>

                {/* Conditional rendering based on selection */}
                {attachmentType === 'commit_link' ? (
                  <div className="space-y-2">
                    <Label htmlFor="commit_link">Commit Message Link *</Label>
                    <Input
                      id="commit_link"
                      type="url"
                      value={commitLink}
                      onChange={(e) => setCommitLink(e.target.value)}
                      placeholder="https://github.com/username/repo/commit/abc123"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enter the full URL to your commit, pull request, or branch
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="covering_files">Upload Files *</Label>
                    <Input
                      id="covering_files"
                      type="file"
                      multiple
                      accept="image/*,.pdf,.json,.py,.js,.ts,.jsx,.tsx,.html,.css,.md,.txt,.yml,.yaml,.xml,.csv,.log"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                      disabled={uploadingProof}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Upload proof of work files (images, PDFs, code files, etc., max 10MB each)
                    </p>
                    {coveringFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">
                          Uploaded Files:
                        </p>
                        <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside">
                          {coveringFiles.map((url, index) => (
                            <li key={index}>{url.split('/').pop()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleProofSubmit}
                    disabled={uploadingProof}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    {uploadingProof ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Proof
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setProofDialogOpen(false)}
                    disabled={uploadingProof}
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
