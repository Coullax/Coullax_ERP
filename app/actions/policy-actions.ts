'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =============================================
// POLICY MANAGEMENT
// =============================================

// Get all employee policies
export async function getAllPolicies() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employee_policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Get policy by ID
export async function getPolicyById(policyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employee_policies')
    .select('*')
    .eq('id', policyId)
    .single()

  if (error) throw error
  return data
}

// Get policy with employee count
export async function getPoliciesWithEmployeeCount() {
  const supabase = await createClient()

  const { data: policies, error: policiesError } = await supabase
    .from('employee_policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (policiesError) throw policiesError

  // Get employee count for each policy
  const policiesWithCount = await Promise.all(
    policies.map(async (policy) => {
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('policy_id', policy.id)

      return {
        ...policy,
        employee_count: count || 0,
      }
    })
  )

  return policiesWithCount
}

// Create new policy
export async function createPolicy(data: {
  name: string
  policy_type: '5_day_permanent' | '6_day_permanent' | 'intern' | 'contract'
  working_days_per_week: number
  leave_days_per_month: number
  carry_forward_enabled: boolean
  description?: string
}) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: policy, error } = await supabase
    .from('employee_policies')
    .insert({
      ...data,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/admin/policies')
  return policy
}

// Update existing policy
export async function updatePolicy(
  policyId: string,
  data: {
    name?: string
    policy_type?: '5_day_permanent' | '6_day_permanent' | 'intern' | 'contract'
    working_days_per_week?: number
    leave_days_per_month?: number
    carry_forward_enabled?: boolean
    description?: string
    is_active?: boolean
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employee_policies')
    .update(data)
    .eq('id', policyId)

  if (error) throw error

  revalidatePath('/admin/policies')
  return { success: true }
}

// Delete policy (only if no employees are assigned)
export async function deletePolicy(policyId: string) {
  const supabase = await createClient()

  // Check if any employees are using this policy
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('policy_id', policyId)

  if (count && count > 0) {
    throw new Error(`Cannot delete policy. ${count} employee(s) are currently assigned to this policy.`)
  }

  const { error } = await supabase
    .from('employee_policies')
    .delete()
    .eq('id', policyId)

  if (error) throw error

  revalidatePath('/admin/policies')
  return { success: true }
}

// =============================================
// LEAVE BALANCE MANAGEMENT
// =============================================

// Calculate and create 12 months of leave balance for an employee
export async function initializeEmployeeLeaveBalance(
  employeeId: string,
  policyId: string,
  assignmentDate?: Date
) {
  const adminClient = createAdminClient()

  // Get policy details
  const { data: policy, error: policyError } = await adminClient
    .from('employee_policies')
    .select('*')
    .eq('id', policyId)
    .single()

  if (policyError) throw policyError

  const startDate = assignmentDate || new Date()
  const currentYear = startDate.getFullYear()
  const currentMonth = startDate.getMonth() + 1 // 1-12

  // Create 12 months of leave balance records starting from assignment month
  const balanceRecords = []
  
  for (let i = 0; i < 12; i++) {
    let month = currentMonth + i
    let year = currentYear

    // Handle year overflow
    if (month > 12) {
      month = month - 12
      year = year + 1
    }

    balanceRecords.push({
      employee_id: employeeId,
      policy_id: policyId,
      month: month,
      year: year,
      total_leaves: policy.leave_days_per_month,
      used_leaves: 0,
      carried_forward_leaves: 0,
      // available_leaves will be calculated by trigger
    })
  }

  const { error: insertError } = await adminClient
    .from('employee_leave_balance')
    .insert(balanceRecords)

  if (insertError) throw insertError

  return { success: true, recordsCreated: balanceRecords.length }
}

// Get employee leave balance for current month
export async function getEmployeeCurrentBalance(employeeId: string) {
  const supabase = await createClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data, error } = await supabase
    .from('employee_leave_balance')
    .select(`
      *,
      policy:employee_policies(name, policy_type, leave_days_per_month)
    `)
    .eq('employee_id', employeeId)
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data
}

// Get employee leave balance history
export async function getEmployeeLeaveHistory(employeeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employee_leave_balance')
    .select(`
      *,
      policy:employee_policies(name, policy_type)
    `)
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(12)

  if (error) throw error
  return data
}

// Update leave balance when leave is approved
export async function deductLeaveFromBalance(
  employeeId: string,
  leaveDays: number,
  leaveMonth: number,
  leaveYear: number
) {
  const adminClient = createAdminClient()

  // Get current balance for the leave month
  const { data: balance, error: fetchError } = await adminClient
    .from('employee_leave_balance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('month', leaveMonth)
    .eq('year', leaveYear)
    .single()

  if (fetchError) throw fetchError

  // Check if sufficient balance
  if (balance.available_leaves < leaveDays) {
    throw new Error('Insufficient leave balance')
  }

  // Update used leaves
  const { error: updateError } = await adminClient
    .from('employee_leave_balance')
    .update({
      used_leaves: balance.used_leaves + leaveDays,
    })
    .eq('id', balance.id)

  if (updateError) throw updateError

  return { success: true, remainingLeaves: balance.available_leaves - leaveDays }
}

// Carry forward logic - to be called monthly via cron or manually
export async function processMonthlyCarryForward(employeeId: string) {
  const adminClient = createAdminClient()

  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Get last month's balance
  const { data: lastMonthBalance, error: lastMonthError } = await adminClient
    .from('employee_leave_balance')
    .select('*, policy:employee_policies(carry_forward_enabled, leave_days_per_month)')
    .eq('employee_id', employeeId)
    .eq('month', lastMonth)
    .eq('year', lastMonthYear)
    .single()

  if (lastMonthError) return { success: false, message: 'No previous month data' }

  // Only carry forward if policy allows and it's the same year
  if (!lastMonthBalance.policy.carry_forward_enabled || lastMonthYear !== currentYear) {
    return { success: false, message: 'Carry forward not enabled or year changed' }
  }

  const carriedForward = lastMonthBalance.available_leaves

  // Update current month's balance
  const { error: updateError } = await adminClient
    .from('employee_leave_balance')
    .update({
      carried_forward_leaves: carriedForward,
      total_leaves: lastMonthBalance.policy.leave_days_per_month + carriedForward,
    })
    .eq('employee_id', employeeId)
    .eq('month', currentMonth)
    .eq('year', currentYear)

  if (updateError) throw updateError

  return { success: true, carriedForward }
}

// Check if employee has sufficient leave balance
export async function checkLeaveBalance(
  employeeId: string,
  requestedDays: number,
  startDate: Date
) {
  const supabase = await createClient()

  const month = startDate.getMonth() + 1
  const year = startDate.getFullYear()

  const { data: balance, error } = await supabase
    .from('employee_leave_balance')
    .select('available_leaves')
    .eq('employee_id', employeeId)
    .eq('month', month)
    .eq('year', year)
    .single()

  if (error) {
    // If no balance record exists, return insufficient
    return { hasBalance: false, available: 0, requested: requestedDays }
  }

  return {
    hasBalance: balance.available_leaves >= requestedDays,
    available: balance.available_leaves,
    requested: requestedDays,
  }
}
