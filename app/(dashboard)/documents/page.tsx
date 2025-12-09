'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DocumentsList } from '@/components/documents/documents-list'
import { DocumentUpload } from '@/components/documents/document-upload'
import { DocumentRequestDialog } from '@/components/documents/document-request-dialog'
import { Document, DocumentCategory, DocumentRequest } from '@/lib/types/documents'
import { Upload, FileQuestion, Search, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [activeTab, setActiveTab] = useState('all')

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL('/api/documents', window.location.origin)
      if (searchQuery) url.searchParams.set('search', searchQuery)
      if (selectedCategory) url.searchParams.set('category', selectedCategory)

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Failed to fetch documents')

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')

      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/requests')
      if (!response.ok) throw new Error('Failed to fetch requests')

      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Failed to load requests:', error)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
    fetchCategories()
    fetchRequests()
  }, [fetchDocuments, fetchCategories, fetchRequests])

  const handleSearch = () => {
    fetchDocuments()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setTimeout(fetchDocuments, 0)
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-gray-500 mt-1">
            Upload, manage, and request documents
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setRequestOpen(true)} variant="outline">
            <FileQuestion className="w-4 h-4 mr-2" />
            Request Document
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory || undefined} onValueChange={(value) => setSelectedCategory(value || '')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Filter className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
          {(searchQuery || selectedCategory) && (
            <Button variant="ghost" onClick={handleClearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="my-documents">My Documents</TabsTrigger>
          <TabsTrigger value="requests">
            My Requests
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="warning" className="ml-2 px-1.5 py-0 text-xs">
                {requests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <DocumentsList
            documents={documents}
            loading={loading}
            onRefresh={fetchDocuments}
          />
        </TabsContent>

        <TabsContent value="my-documents" className="mt-6">
          <DocumentsList
            documents={documents}
            loading={loading}
            onRefresh={fetchDocuments}
          />
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileQuestion className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No document requests</h3>
              <p className="text-sm text-gray-500 mb-4">
                Request documents from the admin team
              </p>
              <Button onClick={() => setRequestOpen(true)}>
                <FileQuestion className="w-4 h-4 mr-2" />
                Request Document
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{request.title}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      {request.description && (
                        <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize">{request.request_type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                        {request.fulfilled_by && request.fulfiller && (
                          <>
                            <span>•</span>
                            <span>Fulfilled by {request.fulfiller.full_name}</span>
                          </>
                        )}
                      </div>
                      {request.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2">
                          Rejection reason: {request.rejection_reason}
                        </p>
                      )}
                    </div>
                    {request.document && (
                      <Button
                        size="sm"
                        onClick={() => window.open(request.document!.file_url, '_blank')}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DocumentUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        categories={categories}
        onSuccess={fetchDocuments}
      />

      <DocumentRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onSuccess={fetchRequests}
      />
    </div>
  )
}
