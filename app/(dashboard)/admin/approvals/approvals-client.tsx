'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateRequestStatus } from '@/app/actions/request-actions'
import { CheckCircle, XCircle, FileText, User, Download, FileSpreadsheet } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { generateRequestPDF, generateRequestsExcel } from '@/lib/export-utils'

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

export function ApprovalsPageClient({ requests, reviewerId }: ApprovalsPageClientProps) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter requests based on status
  const filteredRequests = statusFilter === 'all' 
    ? requests 
    : requests.filter(r => r.status === statusFilter)

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

  return (
    <div className="space-y-6">
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
          onClick={() => setStatusFilter('all')}
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
          onClick={() => setStatusFilter('pending')}
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
          onClick={() => setStatusFilter('approved')}
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
          onClick={() => setStatusFilter('rejected')}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests List */}
        <div className="lg:col-span-2">
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
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedRequest(request)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedRequest?.id === request.id
                          ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-900'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <User className="w-4 h-4 text-gray-400" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {request.employee?.profile?.full_name || 'Unknown'}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDateTime(request.submitted_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(request.status)}
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
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Request Details & Actions */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedRequest ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a request to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {REQUEST_TYPE_LABELS[selectedRequest.request_type]}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {selectedRequest.employee?.profile?.full_name}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Employee ID: {selectedRequest.employee?.employee_id}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Email: {selectedRequest.employee?.profile?.email}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Submitted: {formatDateTime(selectedRequest.submitted_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        {getStatusBadge(selectedRequest.status)}
                      </div>
                    </div>
                  </div>

                  {selectedRequest.reviewed_by && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Review Information</h4>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div>Reviewed By: {selectedRequest.reviewer?.full_name || 'Unknown'}</div>
                        <div>Reviewed Date: {formatDateTime(selectedRequest.reviewed_at)}</div>
                        {selectedRequest.review_notes && (
                          <div>
                            <span className="font-semibold">Notes:</span>
                            <p className="mt-1 italic">{selectedRequest.review_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequest.status === 'pending' && (
                    <>
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

                      <div className="space-y-2">
                        <Button
                          onClick={() => handleApprove(selectedRequest.id)}
                          disabled={loading}
                          className="w-full bg-green-500 hover:bg-green-600 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(selectedRequest.id)}
                          disabled={loading}
                          variant="destructive"
                          className="w-full"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={() => handleDownloadPDF(selectedRequest)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download as PDF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
