'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadToB2 } from './upload-actions'

// Get all requests for current user
export async function getMyRequests(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      employee:employees!requests_employee_id_fkey(
        id,
        employee_id,
        profile:profiles!employees_id_fkey(full_name)
      ),
      reviewer:profiles!requests_reviewed_by_fkey(full_name)
    `)
    .eq('employee_id', userId)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data
}

// Get all pending requests for admin
export async function getPendingRequests() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      employee:employees!requests_employee_id_fkey(
        id,
        employee_id,
        profile:profiles!employees_id_fkey(full_name, email)
      )
    `)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })

  if (error) throw error
  return data
}

// Get all requests for admin (with optional status filter)
export async function getAllRequests(status?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('requests')
    .select(`
      *,
      employee:employees!requests_employee_id_fkey(
        id,
        employee_id,
        profile:profiles!employees_id_fkey(full_name, email)
      ),
      reviewer:profiles!requests_reviewed_by_fkey(full_name)
    `)

  // Apply status filter if provided
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('submitted_at', { ascending: false })

  if (error) throw error
  return data
}


// Create Leave Request
export async function createLeaveRequest(employeeId: string, data: {
  leave_type: string
  start_date: string
  end_date: string
  reason: string
}) {
  const supabase = await createClient()

  // Calculate total days
  const start = new Date(data.start_date)
  const end = new Date(data.end_date)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Check leave balance before creating request
  const { checkLeaveBalance } = await import('./policy-actions')
  const balanceCheck = await checkLeaveBalance(employeeId, totalDays, start)

  if (!balanceCheck.hasBalance) {
    throw new Error(`Insufficient leave balance. Available: ${balanceCheck.available} days, Requested: ${balanceCheck.requested} days`)
  }

  // Create main request
  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'leave',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  // Create leave request details
  const { error: detailError } = await supabase
    .from('leave_requests')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      total_days: totalDays,
      reason: data.reason,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Get Department Head for Employee (for overtime supervisor auto-fill)
export async function getDepartmentHeadForEmployee(employeeId: string) {
  const supabase = await createClient()

  // Get employee's department
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('department_id')
    .eq('id', employeeId)
    .single()

  if (employeeError) throw employeeError
  if (!employee?.department_id) {
    return { supervisor: null, message: 'No department assigned' }
  }

  // Get department head
  const { data: department, error: deptError } = await supabase
    .from('departments')
    .select('head_id')
    .eq('id', employee.department_id)
    .single()

  if (deptError) throw deptError
  if (!department?.head_id) {
    return { supervisor: null, message: 'No department head assigned' }
  }

  // Get supervisor profile
  const { data: supervisor, error: supervisorError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', department.head_id)
    .single()

  if (supervisorError) throw supervisorError

  return { supervisor, message: null }
}

// Create Overtime Request
export async function createOvertimeRequest(employeeId: string, data: {
  date: string
  hours: number
  reason: string
  assigned_supervisor?: string
}) {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'overtime',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: detailError } = await supabase
    .from('overtime_requests')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      date: data.date,
      hours: data.hours,
      reason: data.reason,
      assigned_supervisor: data.assigned_supervisor,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Create Travel Request
export async function createTravelRequest(employeeId: string, data: {
  destination: string
  purpose: string
  start_date: string
  end_date: string
  estimated_cost?: number
}) {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'travel_request',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: detailError } = await supabase
    .from('travel_requests')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      ...data,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Upload Expense Attachment
export async function uploadExpenseAttachment(formData: FormData) {
  const file = formData.get('file') as File
  const employeeId = formData.get('employeeId') as string

  if (!file) throw new Error('No file provided')

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size should be less than 10MB')
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `expenses/${employeeId}/${Date.now()}.${fileExt}`

    // Add filename to formData for uploadToB2
    formData.append('filename', fileName)

    const result = await uploadToB2(formData)

    if (!result.success || !result.publicUrl) {
      throw new Error(result.error || 'Upload failed')
    }

    return {
      url: result.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size
    }
  } catch (error: any) {
    console.error('Expense attachment upload failed:', error)
    throw error
  }
}

// Upload Resignation Document
export async function uploadResignationDocument(formData: FormData) {
  const file = formData.get('file') as File
  const employeeId = formData.get('employeeId') as string

  if (!file) throw new Error('No file provided')

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size should be less than 10MB')
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `resignations/${employeeId}/${Date.now()}.${fileExt}`

    // Add filename to formData for uploadToB2
    formData.append('filename', fileName)

    const result = await uploadToB2(formData)

    if (!result.success || !result.publicUrl) {
      throw new Error(result.error || 'Upload failed')
    }

    return {
      url: result.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size
    }
  } catch (error: any) {
    console.error('Resignation document upload failed:', error)
    throw error
  }
}

// Create Expense Reimbursement
export async function createExpenseRequest(employeeId: string, data: {
  expense_type: string
  amount: number
  expense_date: string
  description: string
  attachments?: string[]
}) {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'expense_reimbursement',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: detailError } = await supabase
    .from('expense_reimbursements')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      expense_type: data.expense_type,
      amount: data.amount,
      expense_date: data.expense_date,
      description: data.description,
      attachments: data.attachments || null,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Create Attendance Regularization
export async function createAttendanceRegularization(employeeId: string, data: {
  date: string
  actual_time?: string
  requested_time: string
  reason: string
}) {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'attendance_regularization',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: detailError } = await supabase
    .from('attendance_regularization_requests')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      ...data,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Create Asset Request
export async function createAssetRequest(employeeId: string, data: {
  asset_type: string
  quantity: number
  reason: string
}) {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'asset_request',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: detailError } = await supabase
    .from('asset_requests')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      ...data,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Create Resignation
export async function createResignation(employeeId: string, data: {
  last_working_date: string
  reason: string
  feedback?: string
  document_url?: string
}) {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'resignation',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: detailError } = await supabase
    .from('resignations')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      ...data,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Create Covering Request
export async function createCoveringRequest(employeeId: string, data: {
  covering_date: string
  start_time: string
  end_time: string
  work_description: string
}) {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'covering',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: detailError } = await supabase
    .from('covering_requests')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      covering_date: data.covering_date,
      start_time: data.start_time,
      end_time: data.end_time,
      work_description: data.work_description,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Approve/Reject Request
export async function updateRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewerId: string,
  notes?: string
) {
  const supabase = await createClient()

  // Get request details to check if it's a leave request
  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('*, leave_requests(*)')
    .eq('id', requestId)
    .single()

  if (requestError) throw requestError

  const { error } = await supabase
    .from('requests')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
    })
    .eq('id', requestId)

  if (error) throw error

  // If approved and it's a leave request, deduct from leave balance
  if (status === 'approved' && request.request_type === 'leave' && request.leave_requests) {
    const leaveRequest = Array.isArray(request.leave_requests)
      ? request.leave_requests[0]
      : request.leave_requests

    if (leaveRequest) {
      const startDate = new Date(leaveRequest.start_date)
      const { deductLeaveFromBalance } = await import('./policy-actions')

      try {
        await deductLeaveFromBalance(
          request.employee_id,
          leaveRequest.total_days,
          startDate.getMonth() + 1,
          startDate.getFullYear()
        )
      } catch (balanceError: any) {
        // If deduction fails, log but don't fail the approval
        console.error('Failed to deduct leave balance:', balanceError)
      }
    }
  }

  revalidatePath('/requests')
  revalidatePath('/admin/approvals')
  return { success: true }
}

// Cancel Request
export async function cancelRequest(requestId: string, userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('employee_id', userId)

  if (error) throw error

  revalidatePath('/requests')
  return { success: true }
}
