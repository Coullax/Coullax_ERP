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

  // Group front/back documents together
  const groupedDocuments = documents.reduce((acc: any[], doc) => {
    // If it's a front-back document type
    if ((doc.document_type === 'NIC' || doc.document_type === 'driving license') && doc.sub_type) {
      // Check if we already have the pair in our accumulated array
      const existingPair = acc.find(item => 
        item.isGroup && 
        item.document_type === doc.document_type &&
        item.employee_id === doc.employee_id &&
        item.groupStatus === doc.status
      )

      if (existingPair) {
        // Add this document to the existing pair
        if (doc.sub_type === 'front') {
          existingPair.frontDoc = doc
        } else {
          existingPair.backDoc = doc
        }
      } else {
        // Create a new pair group
        const newGroup: any = {
          isGroup: true,
          id: `${doc.employee_id}-${doc.document_type}-${doc.status}`,
          employee_id: doc.employee_id,
          document_type: doc.document_type,
          groupStatus: doc.status,
          employee: doc.employee,
          created_at: doc.created_at,
          status: doc.status,
        }
        
        if (doc.sub_type === 'front') {
          newGroup.frontDoc = doc
        } else {
          newGroup.backDoc = doc
        }
        
        acc.push(newGroup)
      }
    } else {
      // Regular single document
      acc.push(doc)
    }
    
    return acc
  }, [])

  const filteredDocs = groupedDocuments.filter(doc =>
    filter === 'all' ? true : doc.status === filter
  )

  const handleApprove = async (doc: any) => {
    setLoading(true)
    try {
      if (doc.isGroup) {
        // Approve both front and back
        const promises = []
        if (doc.frontDoc) {
          promises.push(updateDocumentStatus(doc.frontDoc.id, 'verified', reviewerId, notes || undefined))
        }
        if (doc.backDoc) {
          promises.push(updateDocumentStatus(doc.backDoc.id, 'verified', reviewerId, notes || undefined))
        }
        await Promise.all(promises)
        toast.success(`${getDocumentTypeLabel(doc.document_type)} (both sides) verified successfully!`)
      } else {
        await updateDocumentStatus(doc.id, 'verified', reviewerId, notes || undefined)
        toast.success('Document verified successfully!')
      }
      setSelectedDoc(null)
      setNotes('')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify document')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (doc: any) => {
    if (!notes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    try {
      if (doc.isGroup) {
        // Reject both front and back
        const promises = []
        if (doc.frontDoc) {
          promises.push(updateDocumentStatus(doc.frontDoc.id, 'rejected', reviewerId, notes))
        }
        if (doc.backDoc) {
          promises.push(updateDocumentStatus(doc.backDoc.id, 'rejected', reviewerId, notes))
        }
        await Promise.all(promises)
        toast.success(`${getDocumentTypeLabel(doc.document_type)} (both sides) rejected`)
      } else {
        await updateDocumentStatus(doc.id, 'rejected', reviewerId, notes)
        toast.success('Document rejected')
      }
      setSelectedDoc(null)
      setNotes('')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject document')
    } finally {
      setLoading(false)
    }
  }

  const getDocumentTypeLabel = (docType: string) => {
    // Convert document type to title case for better readability
    return docType
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
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
        {['pending', 'verified', 'rejected', 'all'].map((status) => {
          const count = status === 'all' 
            ? groupedDocuments.length 
            : groupedDocuments.filter(doc => doc.status === status).length
          
          return (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              onClick={() => setFilter(status)}
              className="capitalize relative"
            >
              {status}
              {status === 'pending' && count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                  {count}
                </span>
              )}
            </Button>
          )
        })}
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
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {getDocumentTypeLabel(doc.document_type)}
                            {doc.isGroup && (
                              <span className="ml-2 text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                Front & Back
                              </span>
                            )}
                            {doc.sub_type && !doc.isGroup && (
                              <span className="ml-2 text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 capitalize">
                                {doc.sub_type}
                              </span>
                            )}
                          </span>
                        </div>
                        {doc.document_title && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">
                            📄 {doc.document_title}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded {formatDateTime(doc.frontDoc?.created_at || doc.created_at)}
                        </p>
                        {(doc.frontDoc?.notes || doc.backDoc?.notes || doc.notes) && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                            Note: &quot;{doc.frontDoc?.notes || doc.backDoc?.notes || doc.notes}&quot;
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
                  <span className="font-medium">
                    {getDocumentTypeLabel(selectedDoc.document_type)}
                    {selectedDoc.isGroup && (
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        Front & Back
                      </span>
                    )}
                    {selectedDoc.sub_type && !selectedDoc.isGroup && (
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 capitalize">
                        {selectedDoc.sub_type}
                      </span>
                    )}
                  </span>
                </div>
                {selectedDoc.document_title && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Title:</span>
                    <span className="font-medium">{selectedDoc.document_title}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Uploaded:</span>
                  <span className="font-medium">{formatDateTime(selectedDoc.frontDoc?.created_at || selectedDoc.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  {getStatusBadge(selectedDoc.status)}
                </div>
                {(selectedDoc.frontDoc?.document_number || selectedDoc.document_number) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Document Number:</span>
                    <span className="font-medium">{selectedDoc.frontDoc?.document_number || selectedDoc.document_number}</span>
                  </div>
                )}
              </div>

              {/* Document Preview & Details */}
            <div className="space-y-4">
              {selectedDoc.isGroup ? (
                // Show both front and back images
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Front Image */}
                    {selectedDoc.frontDoc && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Front Side</p>
                        <a
                          href={selectedDoc.frontDoc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={selectedDoc.frontDoc.document_url}
                            alt={`${selectedDoc.document_type} - Front`}
                            className="w-full h-64 object-contain bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                          />
                        </a>
                        {selectedDoc.frontDoc.document_title && (
                          <p className="text-xs text-gray-600">Title: {selectedDoc.frontDoc.document_title}</p>
                        )}
                      </div>
                    )}
                    {/* Back Image */}
                    {selectedDoc.backDoc && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Back Side</p>
                        <a
                          href={selectedDoc.backDoc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={selectedDoc.backDoc.document_url}
                            alt={`${selectedDoc.document_type} - Back`}
                            className="w-full h-64 object-contain bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                          />
                        </a>
                        {selectedDoc.backDoc.document_title && (
                          <p className="text-xs text-gray-600">Title: {selectedDoc.backDoc.document_title}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Single document view
                <a
                  href={selectedDoc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={selectedDoc.document_url}
                    alt={selectedDoc.document_type}
                    className="w-full max-h-96 object-contain bg-gray-100 dark:bg-gray-800 rounded-lg"
                  />
                </a>
              )}
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
              <div className="flex gap-3 pt-4">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => handleApprove(selectedDoc)}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : selectedDoc.isGroup ? 'Approve Both Sides' : 'Approve'}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReject(selectedDoc)}
                  disabled={loading || !notes.trim()}
                >
                  {loading ? 'Processing...' : selectedDoc.isGroup ? 'Reject' : 'Reject'}
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
