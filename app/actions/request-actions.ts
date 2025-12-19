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
      reviewer:profiles!requests_reviewed_by_fkey(full_name),
      leave_requests(*),
      overtime_requests(*),
      travel_requests(*),
      expense_reimbursements(*),
      attendance_regularization_requests(*),
      asset_requests(*),
      asset_issue_requests(*),
      resignations(*),
      covering_requests(*),
      request_for_covering_requests(*)
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
      reviewer:profiles!requests_reviewed_by_fkey(full_name),
      leave_requests(*),
      overtime_requests(*),
      expense_reimbursements(*),
      travel_requests(*),
      attendance_regularization_requests(*),
      asset_requests(*),
      asset_issue_requests(*),
      resignations(*),
      covering_requests!covering_requests_request_id_fkey(*),
      request_for_covering_requests(*)
    `)

  // Apply status filter if provided
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('submitted_at', { ascending: false })

  if (error) throw error
  return data
}


// Helper function to calculate hours between two times
function calculateHoursDifference(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  return (endMinutes - startMinutes) / 60
}

// Helper function to calculate leave days (supports fractional days based on hours)
async function calculateLeaveDays(params: {
  employeeId: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  leaveDuration?: string
}): Promise<number> {
  const { employeeId, startDate, endDate, startTime, endTime, leaveDuration } = params

  const isSameDay = startDate === endDate

  // Get employee work schedule
  const schedule = await getEmployeePolicySchedule(employeeId)
  if (!schedule.schedule) {
    throw new Error('No work schedule found for employee. Cannot calculate leave days.')
  }

  const workHoursPerDay = calculateHoursDifference(
    schedule.schedule.work_start_time,
    schedule.schedule.work_end_time
  )

  // Same day leave
  if (isSameDay) {
    // Full day
    if (leaveDuration === 'full_day') {
      return 1
    }

    // Half day (standard 0.5)
    if (leaveDuration === 'half_day_morning' || leaveDuration === 'half_day_afternoon') {
      return 0.5
    }

    // Custom time - calculate based on hours
    if (startTime && endTime) {
      const leaveHours = calculateHoursDifference(startTime, endTime)
      const fractionalDays = leaveHours / workHoursPerDay
      // Round to 2 decimal places
      return Math.round(fractionalDays * 100) / 100
    }

    // Default to 1 day if no time specified
    return 1
  }

  // Multi-day leave
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDifference = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  let totalDays = daysDifference + 1 // Full days including start and end

  // Adjust for partial first day
  if (startTime) {
    const firstDayHours = calculateHoursDifference(startTime, schedule.schedule.work_end_time)
    const firstDayFraction = firstDayHours / workHoursPerDay
    totalDays = totalDays - 1 + firstDayFraction
  }

  // Adjust for partial last day
  if (endTime) {
    const lastDayHours = calculateHoursDifference(schedule.schedule.work_start_time, endTime)
    const lastDayFraction = lastDayHours / workHoursPerDay
    totalDays = totalDays - 1 + lastDayFraction
  }

  // Round to 2 decimal places
  return Math.round(totalDays * 100) / 100
}

// Create Leave Request
export async function createLeaveRequest(employeeId: string, data: {
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  start_time?: string
  end_time?: string
  leave_duration?: string
}) {
  const supabase = await createClient()

  // Calculate total days using new fractional day calculation
  const totalDays = await calculateLeaveDays({
    employeeId,
    startDate: data.start_date,
    endDate: data.end_date,
    startTime: data.start_time,
    endTime: data.end_time,
    leaveDuration: data.leave_duration
  })

  // Check leave balance before creating request
  const { checkLeaveBalance } = await import('./policy-actions')
  const start = new Date(data.start_date)
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
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      leave_duration: data.leave_duration || null,
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

// Get Employee Policy Schedule (for auto-populating leave times)
export async function getEmployeePolicySchedule(employeeId: string) {
  const supabase = await createClient()

  // Get employee's policy
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('policy_id')
    .eq('id', employeeId)
    .single()

  if (employeeError) throw employeeError
  if (!employee?.policy_id) {
    return { schedule: null, message: 'No policy assigned to this employee' }
  }

  // Get policy work schedule details
  const { data: policy, error: policyError } = await supabase
    .from('employee_policies')
    .select('working_start_time, working_end_time')
    .eq('id', employee.policy_id)
    .single()

  if (policyError) throw policyError
  if (!policy) {
    return { schedule: null, message: 'Policy not found' }
  }

  // Calculate lunch break times if not present (midpoint of work day)
  const calculateLunchBreak = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const midpoint = Math.floor((startMinutes + endMinutes) / 2)

    // Lunch break is 30 minutes before and after midpoint (1 hour total)
    const lunchStart = midpoint - 30
    const lunchEnd = midpoint + 30

    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    return {
      lunch_break_start: formatTime(lunchStart),
      lunch_break_end: formatTime(lunchEnd)
    }
  }

  const lunchBreak = calculateLunchBreak(policy.working_start_time, policy.working_end_time)

  return {
    schedule: {
      work_start_time: policy.working_start_time,
      work_end_time: policy.working_end_time,
      lunch_break_start: lunchBreak.lunch_break_start,
      lunch_break_end: lunchBreak.lunch_break_end
    },
    message: null
  }
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
  asset_specification?: string
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

// Upload Asset Issue Image
export async function uploadAssetIssueImage(formData: FormData) {
  const file = formData.get('file') as File
  const employeeId = formData.get('employeeId') as string

  if (!file) throw new Error('No file provided')

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file')
  }

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size should be less than 10MB')
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `asset-issues/${employeeId}/${Date.now()}.${fileExt}`

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
    console.error('Asset issue image upload failed:', error)
    throw error
  }
}

// Create Asset Issue Request
export async function createAssetIssueRequest(employeeId: string, data: {
  employee_inventory_id: string
  issue_description: string
  issue_image_url: string
  issue_quantity: number
  requested_action: 'repair' | 'dispose' | 'evaluate'
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
    .from('asset_issue_requests')
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
  attachment_type?: string
  commit_link?: string
  covering_files?: string[]
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
      attachment_type: data.attachment_type || null,
      commit_link: data.commit_link || null,
      covering_files: data.covering_files || null,
    })

  if (detailError) throw detailError

  revalidatePath('/requests')
  return { success: true, requestId: request.id }
}

// Create Request for Covering
export async function createRequestForCovering(employeeId: string, data: {
  date: string
  start_time: string
  end_time: string
  reason: string
}) {
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .insert({
      employee_id: employeeId,
      request_type: 'request_for_covering',
      status: 'pending',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: detailError } = await supabase
    .from('request_for_covering_requests')
    .insert({
      request_id: request.id,
      employee_id: employeeId,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      reason: data.reason,
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
  notes?: string,
  coveringDecision?: string
) {
  const supabase = await createClient()

  // Get request details to check if it's a leave request or covering request
  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('*, leave_requests(*), covering_requests(*)')
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

  // If it's a leave request and covering decision is provided, update leave_requests table
  if (request.request_type === 'leave' && coveringDecision) {
    console.log('Updating covering decision for leave request:', {
      requestId,
      coveringDecision,
      requestType: request.request_type
    })

    // Use admin client to bypass RLS policies
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    // Update the covering_decision field for leave requests
    const { data: updateData, error: updateError } = await adminClient
      .from('leave_requests')
      .update({ covering_decision: coveringDecision })
      .eq('request_id', requestId)
      .select()

    if (updateError) {
      console.error('Failed to update covering decision for leave request:', updateError)
      throw new Error(`Failed to update covering decision: ${updateError.message}`)
    }

    if (!updateData || updateData.length === 0) {
      console.warn('No leave_requests record found for request_id:', requestId)
      console.warn('The covering_decision was not saved. Please ensure leave_requests record exists.')
      // Don't throw error - allow the approval to proceed
    } else {
      console.log('Covering decision for leave request updated successfully:', updateData)
    }
  }

  // If it's a covering request and covering decision is provided, update covering_requests table
  if (request.request_type === 'covering' && coveringDecision) {
    console.log('Updating covering decision:', {
      requestId,
      coveringDecision,
      requestType: request.request_type
    })

    // Use admin client to bypass RLS policies
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    // Update the covering_decision field using admin client
    const { data: updateData, error: updateError } = await adminClient
      .from('covering_requests')
      .update({ covering_decision: coveringDecision })
      .eq('request_id', requestId)
      .select()

    if (updateError) {
      console.error('Failed to update covering decision:', updateError)
      throw new Error(`Failed to update covering decision: ${updateError.message}`)
    }

    if (!updateData || updateData.length === 0) {
      console.warn('No covering_requests record found for request_id:', requestId)
      console.warn('The covering_decision was not saved. Please ensure covering_requests record exists.')
      // Don't throw error - allow the approval to proceed
    } else {
      console.log('Covering decision updated successfully:', updateData)
    }
  }

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

  // Create notification for the employee about the request decision
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    let notificationMessage = `Your ${request.request_type.replace(/_/g, ' ')} request has been ${status}`

    // Add covering decision to the message if it's a leave or covering request
    if ((request.request_type === 'leave' || request.request_type === 'covering') && coveringDecision) {
      const decisionText = coveringDecision === 'no_need_to_cover'
        ? 'no need to cover'
        : coveringDecision
      notificationMessage += ` with decision: ${decisionText}`
    }

    if (notes) {
      notificationMessage += `. Notes: ${notes}`
    }

    const { error: notifError } = await adminClient.from('notifications').insert({
      user_id: request.employee_id,
      title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: notificationMessage,
      type: 'request_update'
    })

    if (notifError) {
      console.error('Failed to create notification:', notifError)
    } else {
      console.log('Notification created for employee:', request.employee_id)
    }
  } catch (notifError) {
    console.error('Error creating notification:', notifError)
  }

  revalidatePath('/requests')
  revalidatePath('/admin/requests')
  return { success: true }
}

// Helper function to handle asset issue request approval (inventory movement)
async function handleAssetIssueApproval(
  requestId: string,
  adminDecision: 'maintenance' | 'bin' | 'return' | 'reject',
  adminNotes: string,
  reviewerId: string
) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = createAdminClient()

  // Get the asset issue request details using admin client to bypass RLS
  const { data: assetIssue, error: issueError } = await adminClient
    .from('asset_issue_requests')
    .select('*, employee_inventory:employee_inventory_id(*, category:category_id(name))')
    .eq('request_id', requestId)
    .single()

  if (issueError || !assetIssue) {
    console.error('Asset issue request query error:', {
      requestId,
      error: issueError,
      data: assetIssue
    })
    throw new Error(`Asset issue request not found for request_id: ${requestId}. Error: ${issueError?.message || 'No data returned'}`)
  }

  // Update the asset issue request with admin decision
  const { error: updateError } = await adminClient
    .from('asset_issue_requests')
    .update({
      admin_decision: adminDecision,
      admin_notes: adminNotes
    })
    .eq('request_id', requestId)

  if (updateError) {
    throw new Error(`Failed to update asset issue: ${updateError.message}`)
  }

  // Handle inventory movement based on admin decision
  if (adminDecision === 'maintenance') {
    // Move to maintenance inventory
    const empInv = Array.isArray(assetIssue.employee_inventory)
      ? assetIssue.employee_inventory[0]
      : assetIssue.employee_inventory

    if (!empInv) throw new Error('Employee inventory item not found')

    const issueQty = assetIssue.issue_quantity || 1
    const totalQty = empInv.quantity_assigned || 1

    if (issueQty >= totalQty) {
      // All units have issues - delete from employee_inventory
      const { error: deleteError } = await adminClient
        .from('employee_inventory')
        .delete()
        .eq('id', assetIssue.employee_inventory_id)

      if (deleteError) {
        throw new Error(`Failed to remove from employee inventory: ${deleteError.message}`)
      }
    } else {
      // Partial quantity - reduce employee inventory
      const { error: updateError } = await adminClient
        .from('employee_inventory')
        .update({
          quantity_assigned: totalQty - issueQty
        })
        .eq('id', assetIssue.employee_inventory_id)

      if (updateError) {
        throw new Error(`Failed to update employee inventory: ${updateError.message}`)
      }
    }

    // Insert into maintenance_inventory
    const { error: maintenanceError } = await adminClient
      .from('maintenance_inventory')
      .insert({
        general_inventory_id: empInv.general_inventory_id || null,
        item_name: empInv.item_name,
        category: empInv.category?.name || 'Uncategorized',
        serial_number: empInv.serial_number,
        quantity: issueQty,
        unit_price: null,
        issue_description: assetIssue.issue_description,
        repair_notes: adminNotes,
        status: 'pending',
        source_employee_id: assetIssue.employee_id,
        source_employee_inventory_id: assetIssue.employee_inventory_id,
        created_by: reviewerId,
        last_updated_by: reviewerId
      })

    if (maintenanceError) {
      throw new Error(`Failed to add to maintenance: ${maintenanceError.message}`)
    }

    revalidatePath('/super-admin/maintenance-inventory')
  } else if (adminDecision === 'bin') {
    // Move to bin inventory
    const empInv = Array.isArray(assetIssue.employee_inventory)
      ? assetIssue.employee_inventory[0]
      : assetIssue.employee_inventory

    if (!empInv) throw new Error('Employee inventory item not found')

    const issueQty = assetIssue.issue_quantity || 1
    const totalQty = empInv.quantity_assigned || 1

    if (issueQty >= totalQty) {
      // All units to bin - delete from employee_inventory
      const { error: deleteError } = await adminClient
        .from('employee_inventory')
        .delete()
        .eq('id', assetIssue.employee_inventory_id)

      if (deleteError) {
        throw new Error(`Failed to remove from employee inventory: ${deleteError.message}`)
      }
    } else {
      // Partial quantity - reduce employee inventory
      const { error: updateError } = await adminClient
        .from('employee_inventory')
        .update({
          quantity_assigned: totalQty - issueQty
        })
        .eq('id', assetIssue.employee_inventory_id)

      if (updateError) {
        throw new Error(`Failed to update employee inventory: ${updateError.message}`)
      }
    }

    // Insert into bin_inventory
    const { error: binError } = await adminClient
      .from('bin_inventory')
      .insert({
        general_inventory_id: empInv.general_inventory_id || null,
        item_name: empInv.item_name,
        category: empInv.category?.name || 'Uncategorized',
        serial_number: empInv.serial_number,
        quantity: issueQty,
        unit_price: null,
        reason: assetIssue.issue_description,
        notes: adminNotes,
        created_by: reviewerId
      })

    if (binError) {
      throw new Error(`Failed to add to bin: ${binError.message}`)
    }

    revalidatePath('/super-admin/bin-inventory')
  }
  // 'return' and 'reject' don't move inventory

  revalidatePath('/profile')
  return { success: true }
}

// Update request status with asset issue support
export async function updateAssetIssueRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewerId: string,
  adminDecision?: 'maintenance' | 'bin' | 'return' | 'reject',
  notes?: string
) {
  const supabase = await createClient()

  // Update main request status
  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
    })
    .eq('id', requestId)

  if (updateError) throw updateError

  // Handle inventory movement if approved
  if (status === 'approved' && adminDecision) {
    await handleAssetIssueApproval(requestId, adminDecision, notes || '', reviewerId)
  } else if (status === 'approved' && !adminDecision) {
    // Still need to update the asset_issue_requests with reject decision
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    await adminClient
      .from('asset_issue_requests')
      .update({
        admin_decision: 'reject',
        admin_notes: notes || ''
      })
      .eq('request_id', requestId)
  }

  revalidatePath('/requests')
  revalidatePath('/admin/requests')
  return { success: true }
}

// Upsert Covering Hours (Add or Update)
export async function upsertCoveringHours(employeeId: string, hoursToAdd: number) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = createAdminClient()

  // Check if record exists for this employee
  const { data: existingRecord, error: fetchError } = await adminClient
    .from('covering_hours')
    .select('*')
    .eq('employee_id', employeeId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" error, which is fine
    console.error('Error fetching covering hours:', fetchError)
    throw fetchError
  }

  if (existingRecord) {
    // Update existing record - add to current hours
    const newTotal = existingRecord.hours_to_cover + hoursToAdd
    const { error: updateError } = await adminClient
      .from('covering_hours')
      .update({
        hours_to_cover: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employeeId)

    if (updateError) {
      console.error('Error updating covering hours:', updateError)
      throw updateError
    }

    console.log(`Updated covering hours for employee ${employeeId}: ${existingRecord.hours_to_cover} + ${hoursToAdd} = ${newTotal}`)
  } else {
    // Create new record
    const { error: insertError } = await adminClient
      .from('covering_hours')
      .insert({
        employee_id: employeeId,
        hours_to_cover: hoursToAdd
      })

    if (insertError) {
      console.error('Error inserting covering hours:', insertError)
      throw insertError
    }

    console.log(`Created new covering hours record for employee ${employeeId}: ${hoursToAdd} hours`)
  }

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
