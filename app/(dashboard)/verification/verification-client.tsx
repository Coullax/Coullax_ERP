'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import {
  updateBankDetails,
  uploadKYCDocument,
} from '@/app/actions/verification-actions'
import {
  FileText,
  CreditCard,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  Image as ImageIcon,
  FileType,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import {
  DOCUMENT_SECTIONS,
  DOCUMENT_TYPES,
  getDocumentsBySection,
  validateFileType,
  type DocumentTypeConfig
} from '@/lib/document-config'

const getDocumentsForType = (documents: any[], documentType: string, subType?: string) => {
  return documents.filter(doc =>
    doc.document_type === documentType &&
    (subType ? doc.sub_type === subType : !doc.sub_type || doc.sub_type === null)
  )
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, any> = {
    pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
    verified: { variant: 'success', icon: CheckCircle, label: 'Approved' },
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

function FrontBackUploadSection({ config, userId, documents }: { config: DocumentTypeConfig, userId: string, documents: any[] }) {
  const frontDocs = getDocumentsForType(documents, config.id, 'front')
  const backDocs = getDocumentsForType(documents, config.id, 'back')

  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontTitle, setFrontTitle] = useState('')
  const [backTitle, setBackTitle] = useState('')
  const [showBothSidesDialog, setShowBothSidesDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const canUploadMore = (config: DocumentTypeConfig, subType?: string) => {
    const existingDocs = getDocumentsForType(documents, config.id, subType)

    if (config.uploadMode === 'single' || config.uploadMode === 'front-back') {
      return !existingDocs.some(doc => doc.status === 'verified' || doc.status === 'pending')
    }
    return true
  }

  const canUploadFront = canUploadMore(config, 'front')
  const canUploadBack = canUploadMore(config, 'back')
  const canUpload = canUploadFront && canUploadBack

  const handleFrontFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFileType(file, config)
    if (!validation.valid) {
      toast.error(validation.error)
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB')
      e.target.value = ''
      return
    }

    setFrontFile(file)
    e.target.value = ''

    if (backFile) {
      setShowBothSidesDialog(true)
    }
  }

  const handleBackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFileType(file, config)
    if (!validation.valid) {
      toast.error(validation.error)
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB')
      e.target.value = ''
      return
    }

    setBackFile(file)
    e.target.value = ''

    if (frontFile) {
      setShowBothSidesDialog(true)
    }
  }

  const handleUploadBothSides = async () => {
    if (!frontFile || !backFile) {
      toast.error('Please select both front and back images')
      return
    }

    setLoading(true)
    setShowBothSidesDialog(false)

    try {
      // Upload front
      const frontFormData = new FormData()
      frontFormData.append('file', frontFile)
      frontFormData.append('employeeId', userId)
      frontFormData.append('documentType', config.id)
      frontFormData.append('subType', 'front')
      if (frontTitle.trim()) {
        frontFormData.append('documentTitle', frontTitle.trim())
      }

      await uploadKYCDocument(frontFormData)

      // Upload back
      const backFormData = new FormData()
      backFormData.append('file', backFile)
      backFormData.append('employeeId', userId)
      backFormData.append('documentType', config.id)
      backFormData.append('subType', 'back')
      if (backTitle.trim()) {
        backFormData.append('documentTitle', backTitle.trim())
      }

      await uploadKYCDocument(backFormData)

      toast.success(`${config.label} (both sides) uploaded successfully!`)

      setFrontFile(null)
      setBackFile(null)
      setFrontTitle('')
      setBackTitle('')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload documents')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBothSides = () => {
    setShowBothSidesDialog(false)
    setFrontFile(null)
    setBackFile(null)
    setFrontTitle('')
    setBackTitle('')
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      {frontDocs.some(doc => doc.status === 'verified') ? null : (<div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
          📋 Please upload both front and back images to submit your {config.label}
        </p>
      </div>)}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Front Upload */}
        <div className="space-y-3">
          <div
            className={`p-6 border-2 border-dashed rounded-xl transition-all ${!canUpload
              ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60'
              : frontFile
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
              }`}
          >
            <Label
              htmlFor={`upload-${config.id}-front`}
              className={!canUpload ? 'cursor-not-allowed' : 'cursor-pointer'}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                {frontDocs.some(doc => doc.status === 'verified') ? (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                ) : frontFile ? (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-base">{config.label}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Front Side</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {!canUpload
                      ? frontDocs.some(doc => doc.status === 'verified')
                        ? 'Approved'
                        : 'Pending...'
                      : frontFile
                        ? `✓ ${frontFile.name}`
                        : 'Click to select'
                    }
                  </p>
                </div>
              </div>
            </Label>
            <input
              id={`upload-${config.id}-front`}
              type="file"
              className="hidden"
              accept={config.acceptedExtensions}
              onChange={handleFrontFileSelect}
              disabled={loading || !canUpload}
            />
          </div>

          {/* Front History */}
          {frontDocs.length > 0 && (
            <div className="space-y-2">
              {frontDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {doc.document_title && (
                        <p className="text-xs font-semibold">
                          {doc.document_title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatDateTime(doc.created_at)}
                      </p>
                      {doc.notes && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                          &quot;{doc.notes}&quot;
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc.status)}
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Upload */}
        <div className="space-y-3">
          <div
            className={`p-6 border-2 border-dashed rounded-xl transition-all ${!canUpload
              ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60'
              : backFile
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
              }`}
          >
            <Label
              htmlFor={`upload-${config.id}-back`}
              className={!canUpload ? 'cursor-not-allowed' : 'cursor-pointer'}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                {backDocs.some(doc => doc.status === 'verified') ? (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                ) : backFile ? (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-base">{config.label}</p>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Back Side</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {!canUpload
                      ? backDocs.some(doc => doc.status === 'verified')
                        ? 'Approved'
                        : 'Pending...'
                      : backFile
                        ? `✓ ${backFile.name}`
                        : 'Click to select'
                    }
                  </p>
                </div>
              </div>
            </Label>
            <input
              id={`upload-${config.id}-back`}
              type="file"
              className="hidden"
              accept={config.acceptedExtensions}
              onChange={handleBackFileSelect}
              disabled={loading || !canUpload}
            />
          </div>

          {/* Back History */}
          {backDocs.length > 0 && (
            <div className="space-y-2">
              {backDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {doc.document_title && (
                        <p className="text-xs font-semibold">
                          {doc.document_title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatDateTime(doc.created_at)}
                      </p>
                      {doc.notes && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                          &quot;{doc.notes}&quot;
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc.status)}
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      {frontFile && backFile && (
        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={() => setShowBothSidesDialog(true)}
            disabled={loading}
            className="w-full md:w-auto"
          >
            Submit {config.label} (Both Sides)
          </Button>
        </div>
      )}

      {/* Both Sides Upload Dialog */}
      {showBothSidesDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Submit {config.label}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                You can add optional titles for each side
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Front Title */}
                <div className="space-y-2">
                  <Label htmlFor="front-title">Front Side Title (Optional)</Label>
                  <Input
                    id="front-title"
                    placeholder="e.g., My NIC Front"
                    value={frontTitle}
                    onChange={(e) => setFrontTitle(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    File: {frontFile?.name}
                  </p>
                </div>

                {/* Back Title */}
                <div className="space-y-2">
                  <Label htmlFor="back-title">Back Side Title (Optional)</Label>
                  <Input
                    id="back-title"
                    placeholder="e.g., My NIC Back"
                    value={backTitle}
                    onChange={(e) => setBackTitle(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    File: {backFile?.name}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancelBothSides}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadBothSides}
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload Both Sides'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {config.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {config.description}
        </p>
      )}
    </div>
  )
}

interface VerificationPageClientProps {
  userId: string
  documents: any[]
  bankDetails: any
}

export function VerificationPageClient({
  userId,
  documents,
  bankDetails,
}: VerificationPageClientProps) {
  const [loading, setLoading] = useState(false)
  const [bankData, setBankData] = useState({
    bank_name: bankDetails?.bank_name || '',
    account_number: bankDetails?.account_number || '',
    routing_number: bankDetails?.routing_number || '',
    account_holder_name: bankDetails?.account_holder_name || '',
  })

  // Title dialog state
  const [showTitleDialog, setShowTitleDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentTitle, setDocumentTitle] = useState('')
  const [pendingUpload, setPendingUpload] = useState<{
    documentType: string
    subType?: string
    config: DocumentTypeConfig
  } | null>(null)

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateBankDetails(userId, bankData)
      toast.success('Bank details updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update bank details')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: string,
    subType?: string
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const config = DOCUMENT_TYPES.find(dt => dt.id === documentType)
    if (!config) {
      toast.error('Invalid document type')
      e.target.value = ''
      return
    }

    // Validate file type
    const validation = validateFileType(file, config)
    if (!validation.valid) {
      toast.error(validation.error)
      e.target.value = '' // Reset input
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB')
      e.target.value = ''
      return
    }

    // Show title dialog for all documents
    setSelectedFile(file)
    setDocumentTitle('')
    setPendingUpload({ documentType, subType, config })
    setShowTitleDialog(true)
    e.target.value = ''
  }

  const handleUploadWithTitle = async () => {
    if (!selectedFile || !pendingUpload) return

    setLoading(true)
    setShowTitleDialog(false)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('employeeId', userId)
      formData.append('documentType', pendingUpload.documentType)

      if (pendingUpload.subType) {
        formData.append('subType', pendingUpload.subType)
      }

      // Add title if provided (optional for all documents)
      if (documentTitle.trim()) {
        formData.append('documentTitle', documentTitle.trim())
      }

      await uploadKYCDocument(formData)

      const titleSuffix = pendingUpload.subType ? ` (${pendingUpload.subType})` : ''
      toast.success(`${pendingUpload.config.label}${titleSuffix} uploaded successfully!`)

      setSelectedFile(null)
      setDocumentTitle('')
      setPendingUpload(null)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelUpload = () => {
    setShowTitleDialog(false)
    setSelectedFile(null)
    setDocumentTitle('')
    setPendingUpload(null)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      verified: { variant: 'success', icon: CheckCircle, label: 'Approved' },
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

  const getDocumentsForType = (documentType: string, subType?: string) => {
    return documents.filter(doc =>
      doc.document_type === documentType &&
      (subType ? doc.sub_type === subType : !doc.sub_type || doc.sub_type === null)
    )
  }

  const canUploadMore = (config: DocumentTypeConfig, subType?: string) => {
    const existingDocs = getDocumentsForType(config.id, subType)

    if (config.uploadMode === 'single' || config.uploadMode === 'front-back') {
      // Check if there's already an approved or pending document
      return !existingDocs.some(doc => doc.status === 'verified' || doc.status === 'pending')
    }

    // Multiple uploads are always allowed
    return true
  }

  const renderSingleUpload = (config: DocumentTypeConfig) => {
    const existingDocs = getDocumentsForType(config.id)
    const hasApprovedOrPending = existingDocs.some(doc => doc.status === 'verified' || doc.status === 'pending')
    const canUpload = canUploadMore(config)

    return (
      <div className="space-y-3">
        {/* Upload Area */}
        <div
          className={`p-6 border-2 border-dashed rounded-xl transition-all ${hasApprovedOrPending
            ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
        >
          <Label
            htmlFor={`upload-${config.id}`}
            className={hasApprovedOrPending ? 'cursor-not-allowed' : 'cursor-pointer'}
          >
            <div className="flex flex-col items-center gap-3 text-center">

              {hasApprovedOrPending ? existingDocs.some(doc => doc.status === 'verified') ? (
                <CheckCircle className="w-10 h-10 text-green-500" />
              ) : (
                <Clock className="w-10 h-10 text-gray-400" />
              ) : config.fileTypes === 'pdf' ? (
                <FileType className="w-10 h-10 text-gray-400" />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-400" />
              )}
              <div>
                <p className="font-semibold text-base">{config.label}</p>
                {config.description && (
                  <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {hasApprovedOrPending
                    ? existingDocs.some(doc => doc.status === 'verified')
                      ? 'Document approved'
                      : 'Verification pending...'
                    : `Click to upload ${config.fileTypes === 'pdf' ? 'PDF' : 'image'}`
                  }
                </p>
              </div>
            </div>
          </Label>
          <input
            id={`upload-${config.id}`}
            type="file"
            className="hidden"
            accept={config.acceptedExtensions}
            onChange={(e) => handleFileUpload(e, config.id)}
            disabled={loading || !canUpload}
          />
        </div>

        {/* Upload History */}
        {existingDocs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload History</p>
            {existingDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {doc.document_title && (
                      <p className="text-sm font-semibold truncate">
                        {doc.document_title}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Uploaded {formatDateTime(doc.created_at)}
                    </p>
                    {doc.notes && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic">
                        &quot;{doc.notes}&quot;
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(doc.status)}
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }



  const renderMultipleUpload = (config: DocumentTypeConfig) => {
    const existingDocs = getDocumentsForType(config.id)

    return (
      <div className="space-y-4">
        {/* Upload Area */}
        <div className="p-6 border-2 border-dashed rounded-xl border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all">
          <Label
            htmlFor={`upload-${config.id}`}
            className="cursor-pointer"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/30">
                <Plus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-base">{config.label}</p>
                {config.description && (
                  <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Click to upload {existingDocs.length > 0 ? 'another document' : 'documents'}
                </p>
              </div>
            </div>
          </Label>
          <input
            id={`upload-${config.id}`}
            type="file"
            className="hidden"
            accept={config.acceptedExtensions}
            onChange={(e) => handleFileUpload(e, config.id)}
            disabled={loading}
          />
        </div>

        {/* Upload History */}
        {existingDocs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Uploaded Documents ({existingDocs.length})
              </p>
            </div>
            <div className="space-y-2">
              {existingDocs.map((doc, index) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        {config.fileTypes === 'pdf' || doc.document_url?.endsWith('.pdf') ? (
                          <FileType className="w-5 h-5 text-red-500" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">
                            {doc.document_title || `Document #${index + 1}`}
                          </p>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded {formatDateTime(doc.created_at)}
                        </p>
                        {doc.notes && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic">
                            Reviewer note: &quot;{doc.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDocumentUpload = (config: DocumentTypeConfig) => {
    switch (config.uploadMode) {
      case 'single':
        return renderSingleUpload(config)
      case 'front-back':
        return <FrontBackUploadSection config={config} userId={userId} documents={documents} />
      case 'multiple':
        return renderMultipleUpload(config)
      default:
        return null
    }
  }

  const getVerificationStats = () => {
    const stats = {
      total: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
    }

    documents.forEach(doc => {
      stats.total++
      if (doc.status === 'pending') stats.pending++
      else if (doc.status === 'verified') stats.verified++
      else if (doc.status === 'rejected') stats.rejected++
    })

    return stats
  }

  const stats = getVerificationStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Verification</h1>
        <p className="text-gray-500 mt-1">Manage your KYC documents and bank details</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Verified</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.verified}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{stats.rejected}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Universal Title Input Dialog */}
      {showTitleDialog && pendingUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Document Title (Optional)</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                You can provide a descriptive title for this {pendingUpload.config.label}
                {pendingUpload.subType && ` (${pendingUpload.subType})`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="universal-document-title">
                  Document Title {pendingUpload.config.uploadMode === 'multiple' && '*'}
                </Label>
                <Input
                  id="universal-document-title"
                  placeholder={
                    pendingUpload.config.id === 'educational certificates'
                      ? "e.g., Bachelor's Degree in Computer Science"
                      : pendingUpload.config.id === 'professional certificates'
                        ? "e.g., AWS Certified Solutions Architect"
                        : pendingUpload.config.id === 'previous service records'
                          ? "e.g., Experience Letter from XYZ Company"
                          : pendingUpload.config.id === 'NIC' || pendingUpload.config.id === 'driving license'
                            ? "e.g., My Personal ID"
                            : pendingUpload.config.id === 'passport'
                              ? "e.g., Personal Passport"
                              : "e.g., Document description"
                  }
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (pendingUpload.config.uploadMode === 'multiple' && !documentTitle.trim()) {
                        toast.error('Please enter a title for this document')
                      } else {
                        handleUploadWithTitle()
                      }
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  File: {selectedFile?.name}
                </p>
                {pendingUpload.config.uploadMode !== 'multiple' && (
                  <p className="text-xs text-gray-400">
                    You can skip this and upload without a title
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelUpload}
                  disabled={loading}
                >
                  Cancel
                </Button>
                {pendingUpload.config.uploadMode !== 'multiple' && (
                  <Button
                    variant="outline"
                    onClick={handleUploadWithTitle}
                    disabled={loading}
                  >
                    Skip & Upload
                  </Button>
                )}
                <Button
                  onClick={handleUploadWithTitle}
                  disabled={loading || (pendingUpload.config.uploadMode === 'multiple' && !documentTitle.trim())}
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <p className="text-sm text-gray-500">
                Upload your verification documents organized by category
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={['personal', 'education']} className="w-full">
                {/* Personal Documents Section */}
                <AccordionItem value="personal">
                  <AccordionTrigger className="text-lg font-semibold">
                    📄 {DOCUMENT_SECTIONS.personal.label}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-gray-500 mb-4">{DOCUMENT_SECTIONS.personal.description}</p>
                    <div className="space-y-6">
                      {getDocumentsBySection('personal').map((config) => (
                        <div key={config.id} className="pb-6 border-b border-gray-200 dark:border-gray-800 last:border-0 last:pb-0">
                          {renderDocumentUpload(config)}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Education & Experience Section */}
                <AccordionItem value="education">
                  <AccordionTrigger className="text-lg font-semibold">
                    🎓 {DOCUMENT_SECTIONS.education.label}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-gray-500 mb-4">{DOCUMENT_SECTIONS.education.description}</p>
                    <div className="space-y-6">
                      {getDocumentsBySection('education').map((config) => (
                        <div key={config.id} className="pb-6 border-b border-gray-200 dark:border-gray-800 last:border-0 last:pb-0">
                          {renderDocumentUpload(config)}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Other Documents Section */}
                <AccordionItem value="other">
                  <AccordionTrigger className="text-lg font-semibold">
                    📎 {DOCUMENT_SECTIONS.other.label}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-gray-500 mb-4">{DOCUMENT_SECTIONS.other.description}</p>
                    <div className="space-y-6">
                      {getDocumentsBySection('other').map((config) => (
                        <div key={config.id} className="pb-6 border-b border-gray-200 dark:border-gray-800 last:border-0 last:pb-0">
                          {renderDocumentUpload(config)}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Bank Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBankSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input
                      id="bank_name"
                      value={bankData.bank_name}
                      onChange={(e) => setBankData({ ...bankData, bank_name: e.target.value })}
                      required
                      placeholder="State Bank of India"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                    <Input
                      id="account_holder_name"
                      value={bankData.account_holder_name}
                      onChange={(e) => setBankData({ ...bankData, account_holder_name: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number *</Label>
                    <Input
                      id="account_number"
                      value={bankData.account_number}
                      onChange={(e) => setBankData({ ...bankData, account_number: e.target.value })}
                      required
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="routing_number">Routing Number</Label>
                    <Input
                      id="routing_number"
                      value={bankData.routing_number}
                      onChange={(e) => setBankData({ ...bankData, routing_number: e.target.value })}
                      placeholder="021000021"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Bank Details'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
