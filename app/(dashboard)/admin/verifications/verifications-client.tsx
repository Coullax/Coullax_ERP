'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { updateDocumentStatus } from '@/app/actions/verification-actions'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  X,
  User,
} from 'lucide-react'
import { getInitials, formatDateTime } from '@/lib/utils'

interface VerificationsPageClientProps {
  documents: any[]
  stats: any
  reviewerId: string
}

export function VerificationsPageClient({
  documents,
  stats,
  reviewerId,
}: VerificationsPageClientProps) {
  const [filter, setFilter] = useState<string>('pending')
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')

  const filteredDocs = documents.filter(doc => 
    filter === 'all' ? true : doc.status === filter
  )

  const handleApprove = async (docId: string) => {
    setLoading(true)
    try {
      await updateDocumentStatus(docId, 'verified', reviewerId, notes || undefined)
      toast.success('Document verified successfully!')
      setSelectedDoc(null)
      setNotes('')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify document')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (docId: string) => {
    if (!notes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    try {
      await updateDocumentStatus(docId, 'rejected', reviewerId, notes)
      toast.success('Document rejected')
      setSelectedDoc(null)
      setNotes('')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject document')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      verified: { variant: 'success', icon: CheckCircle, label: 'Verified' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
    }
    const config = variants[status] || { variant: 'secondary', icon: Clock, label: status }
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Document Verifications</h1>
        <p className="text-gray-500 mt-1">Review and approve employee documents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Documents</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verified</p>
                <p className="text-3xl font-bold">{stats.verified}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-3xl font-bold">{stats.rejected}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['pending', 'verified', 'rejected', 'all'].map((status) => (
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

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({filteredDocs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Employee Avatar */}
                      <Avatar>
                        <AvatarImage src={doc.employee?.profile?.avatar_url} />
                        <AvatarFallback>
                          {doc.employee?.profile 
                            ? getInitials(doc.employee.profile.full_name)
                            : <User className="w-4 h-4" />
                          }
                        </AvatarFallback>
                      </Avatar>

                      {/* Document Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {doc.employee?.profile?.full_name || 'Unknown Employee'}
                          </h4>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {doc.employee?.profile?.email}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium capitalize">
                            {doc.document_type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded {formatDateTime(doc.created_at)}
                        </p>
                        {doc.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                            Note: "{doc.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Review Document</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedDoc.employee?.profile?.avatar_url} />
                  <AvatarFallback>
                    {selectedDoc.employee?.profile 
                      ? getInitials(selectedDoc.employee.profile.full_name)
                      : <User className="w-4 h-4" />
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedDoc.employee?.profile?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedDoc.employee?.profile?.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ID: {selectedDoc.employee?.employee_id}
                  </p>
                </div>
              </div>

              {/* Document Details */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Document Type:</span>
                  <span className="font-medium capitalize">
                    {selectedDoc.document_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Uploaded:</span>
                  <span className="font-medium">{formatDateTime(selectedDoc.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  {getStatusBadge(selectedDoc.status)}
                </div>
                {selectedDoc.document_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Document Number:</span>
                    <span className="font-medium">{selectedDoc.document_number}</span>
                  </div>
                )}
              </div>

              {/* Document Preview/Link */}
              <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800">
                <a
                  href={selectedDoc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-5 h-5" />
                  <span>View Document</span>
                </a>
              </div>

              {/* Notes Input */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Notes {selectedDoc.status === 'pending' && '(Required for rejection)'}
                </Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this document..."
                />
              </div>

              {/* Action Buttons */}
              {selectedDoc.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(selectedDoc.id)}
                    disabled={loading}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedDoc.id)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {loading ? 'Processing...' : 'Approve'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
