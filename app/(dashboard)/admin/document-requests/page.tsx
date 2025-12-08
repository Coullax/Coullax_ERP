'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DocumentRequest, DocumentCategory } from '@/lib/types/documents'
import { DocumentUpload } from '@/components/documents/document-upload'
import { FileCheck, FileX, Clock, Search, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

export default function AdminDocumentRequestsPage() {
    const [requests, setRequests] = useState<DocumentRequest[]>([])
    const [categories, setCategories] = useState<DocumentCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('pending')
    const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null)
    const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false)
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [uploadOpen, setUploadOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        fetchRequests()
        fetchCategories()
    }, [activeTab])

    const fetchRequests = async () => {
        setLoading(true)
        try {
            const url = new URL('/api/admin/document-requests', window.location.origin)
            if (activeTab !== 'all') {
                url.searchParams.set('status', activeTab)
            }

            const response = await fetch(url.toString())
            if (!response.ok) throw new Error('Failed to fetch requests')

            const data = await response.json()
            setRequests(data.requests || [])
        } catch (error) {
            toast.error('Failed to load document requests')
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/documents/categories')
            if (!response.ok) throw new Error('Failed to fetch categories')

            const data = await response.json()
            setCategories(data.categories || [])
        } catch (error) {
            console.error('Failed to load categories:', error)
        }
    }

    const handleFulfill = (request: DocumentRequest) => {
        setSelectedRequest(request)
        setUploadOpen(true)
    }

    const handleDocumentUploadSuccess = async (document: any) => {
        if (!selectedRequest) return

        setActionLoading(true)
        try {
            const response = await fetch(`/api/admin/document-requests/${selectedRequest.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'fulfill',
                    document_id: document.id,
                }),
            })

            if (!response.ok) throw new Error('Failed to fulfill request')

            toast.success('Document request fulfilled successfully')
            setUploadOpen(false)
            setSelectedRequest(null)
            fetchRequests()
        } catch (error) {
            toast.error('Failed to fulfill request')
        } finally {
            setActionLoading(false)
        }
    }

    const handleReject = (request: DocumentRequest) => {
        setSelectedRequest(request)
        setRejectDialogOpen(true)
    }

    const handleRejectConfirm = async () => {
        if (!selectedRequest || !rejectionReason) {
            toast.error('Please provide a rejection reason')
            return
        }

        setActionLoading(true)
        try {
            const response = await fetch(`/api/admin/document-requests/${selectedRequest.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    rejection_reason: rejectionReason,
                }),
            })

            if (!response.ok) throw new Error('Failed to reject request')

            toast.success('Document request rejected')
            setRejectDialogOpen(false)
            setSelectedRequest(null)
            setRejectionReason('')
            fetchRequests()
        } catch (error) {
            toast.error('Failed to reject request')
        } finally {
            setActionLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'fulfilled':
                return <Badge variant="success">Fulfilled</Badge>
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>
            default:
                return <Badge variant="warning">Pending</Badge>
        }
    }

    const stats = {
        pending: requests.filter(r => r.status === 'pending').length,
        fulfilled: requests.filter(r => r.status === 'fulfilled').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Document Requests</h1>
                <p className="text-gray-500 mt-1">
                    Manage employee document requests
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                            <p className="text-sm text-gray-500">Pending</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <FileCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.fulfilled}</p>
                            <p className="text-sm text-gray-500">Fulfilled</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                            <FileX className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.rejected}</p>
                            <p className="text-sm text-gray-500">Rejected</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="pending">
                        Pending
                        {stats.pending > 0 && (
                            <Badge variant="warning" className="ml-2 px-1.5 py-0 text-xs">
                                {stats.pending}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="all">All Requests</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Search className="w-12 h-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
                            <p className="text-sm text-gray-500">
                                {activeTab === 'pending'
                                    ? 'No pending document requests at the moment'
                                    : `No ${activeTab} requests found`
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((request) => (
                                <Card key={request.id} className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            {/* Header */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <h3 className="font-semibold text-lg">{request.title}</h3>
                                                {getStatusBadge(request.status)}
                                            </div>

                                            {/* Employee Info */}
                                            {request.employee && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                    <span className="font-medium">Requested by:</span>
                                                    <span>{request.employee.profiles.full_name}</span>
                                                    <span className="text-gray-400">({request.employee.employee_id})</span>
                                                </div>
                                            )}

                                            {/* Description */}
                                            {request.description && (
                                                <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                                            )}

                                            {/* Metadata */}
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="capitalize font-medium">
                                                    {request.request_type.replace('_', ' ')}
                                                </span>
                                                <span>•</span>
                                                <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                                                {request.fulfiller && (
                                                    <>
                                                        <span>•</span>
                                                        <span>By {request.fulfiller.full_name}</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Rejection Reason */}
                                            {request.rejection_reason && (
                                                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                                    <p className="text-sm text-red-600">
                                                        <span className="font-semibold">Rejection reason:</span> {request.rejection_reason}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 ml-4">
                                            {request.status === 'pending' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleFulfill(request)}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Fulfill
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleReject(request)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            {request.document && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => window.open(request.document!.file_url, '_blank')}
                                                >
                                                    View Document
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Upload Dialog for Fulfilling Request */}
            <DocumentUpload
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                categories={categories}
                onSuccess={handleDocumentUploadSuccess}
            />

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Document Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this request. The employee will be notified.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                            <Textarea
                                id="rejection_reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explain why this request is being rejected..."
                                rows={4}
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setRejectDialogOpen(false)
                                    setRejectionReason('')
                                }}
                                className="flex-1"
                                disabled={actionLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleRejectConfirm}
                                className="flex-1"
                                disabled={actionLoading || !rejectionReason}
                            >
                                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
