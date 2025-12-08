'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  updateBankDetails,
  uploadKYCDocument,
} from '@/app/actions/verification-actions'
import { FileText, CreditCard, Upload, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('employeeId', userId)
      formData.append('documentType', documentType)

      await uploadKYCDocument(formData)
      toast.success('Document uploaded successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document')
    } finally {
      setLoading(false)
    }
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

  // useEffect(() => {
  //   console.log('Documents:', documents)
  // }, [documents])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Verification</h1>
        <p className="text-gray-500 mt-1">Manage your KYC documents and bank details</p>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <div className="space-y-4">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['aadhar', 'pan', 'passport', 'driving_license', 'education', 'experience'].map((docType) => {
                  const existingDoc = documents.find(doc => doc.document_type === docType)
                  const isPending = existingDoc?.status === 'pending'
                  
                  return (
                    <div 
                      key={docType} 
                      className={`p-4 border-2 border-dashed rounded-xl ${
                        isPending 
                          ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60' 
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      <Label 
                        htmlFor={`upload-${docType}`} 
                        className={isPending ? 'cursor-not-allowed' : 'cursor-pointer'}
                      >
                        <div className="flex flex-col items-center gap-2 text-center">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="font-medium capitalize">{docType.replace('_', ' ')}</span>
                          <span className="text-xs text-gray-500">
                            {isPending ? 'Verification pending...' : 'Click to upload'}
                          </span>
                        </div>
                      </Label>
                      <input
                        id={`upload-${docType}`}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, docType)}
                        disabled={loading || isPending}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold capitalize">
                                {doc.document_type.replace('_', ' ')}
                              </h4>
                              <p className="text-sm text-gray-500">{doc.file_name}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Uploaded on {formatDateTime(doc.uploaded_at)}
                              </p>
                              {doc.verification_notes && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                  &quot;{doc.verification_notes}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(doc.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
