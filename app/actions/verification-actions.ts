'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadToB2 } from './upload-actions'

// Get employee KYC documents
export async function getEmployeeDocuments(employeeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Upload KYC Document
export async function uploadKYCDocument(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('file') as File
  const employeeId = formData.get('employeeId') as string
  const documentType = formData.get('documentType') as string

  if (!file) throw new Error('No file provided')

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `verification/${employeeId}/${documentType}-${Date.now()}.${fileExt}`

    // Add filename to formData for uploadToB2
    formData.append('filename', fileName)

    const result = await uploadToB2(formData)

    if (!result.success || !result.publicUrl) {
      throw new Error(result.error || 'Document upload failed')
    }

    // Save document record
    await supabase.from('kyc_documents').insert({
      employee_id: employeeId,
      document_type: documentType,
      document_url: result.publicUrl,
      status: 'pending',
    })

    revalidatePath('/verification')
    return { url: result.publicUrl }
  } catch (error: any) {
    console.error('Document upload failed:', error)
    throw error
  }
}

// Get bank details
export async function getBankDetails(employeeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bank_details')
    .select('*')
    .eq('employee_id', employeeId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Update bank details
export async function updateBankDetails(employeeId: string, data: {
  bank_name: string
  account_number: string
  routing_number?: string
  account_holder_name: string
}) {
  const supabase = await createClient()

  // Check if bank details exist
  const { data: existing } = await supabase
    .from('bank_details')
    .select('id')
    .eq('employee_id', employeeId)
    .single()

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('bank_details')
      .update(data)
      .eq('employee_id', employeeId)

    if (error) throw error
  } else {
    // Insert new
    const { error } = await supabase
      .from('bank_details')
      .insert({
        employee_id: employeeId,
        ...data,
      })

    if (error) throw error
  }

  revalidatePath('/verification')
  return { success: true }
}

// Admin: Approve/Reject document
export async function updateDocumentStatus(
  documentId: string,
  status: 'verified' | 'rejected',
  reviewerId: string,
  notes?: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('kyc_documents')
    .update({
      status,
      verified_by: reviewerId,
      verified_at: new Date().toISOString(),
      notes,
    })
    .eq('id', documentId)

  if (error) throw error

  revalidatePath('/verification')
  revalidatePath('/admin/verifications')
  return { success: true }
}

// Admin: Get all documents for verification
export async function getAllDocumentsForVerification() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kyc_documents')
    .select(`
      *,
      employee:employees!kyc_documents_employee_id_fkey(
        id,
        employee_id,
        profile:profiles!employees_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Admin: Get verification statistics
export async function getVerificationStats() {
  const supabase = await createClient()

  const { data: allDocs } = await supabase
    .from('kyc_documents')
    .select('status')

  const stats = {
    total: allDocs?.length || 0,
    pending: allDocs?.filter(d => d.status === 'pending').length || 0,
    verified: allDocs?.filter(d => d.status === 'verified').length || 0,
    rejected: allDocs?.filter(d => d.status === 'rejected').length || 0,
  }

  return stats
}
