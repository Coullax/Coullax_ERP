'use client'

import { useState } from 'react'
import {motion} from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

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

export function RequestsPageClient({ requests, userId }: RequestsPageClientProps) {
  const [filter, setFilter] = useState<string>('all')

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter)

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
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No requests found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const typeConfig = REQUEST_TYPES[request.request_type] || { label: request.request_type, icon: FileText, color: 'gray' }
                const Icon = typeConfig.icon

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
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
                              "{request.review_notes}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
