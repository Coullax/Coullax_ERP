'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Get all employees with their profiles
export async function getAllEmployees() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      employee_id,
      employee_no,
      joining_date,
      is_active,
      policy_id,
      policy_assigned_date,
      date_of_birth,
      gender,
      blood_group,
      marital_status,
      address,
      city,
      state,
      postal_code,
      country,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      department:departments(id, name),
      designation:designations(id, title),
      profile:profiles!employees_id_fkey(
        id,
        full_name,
        email,
        role,
        avatar_url,
        phone
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Update employee role
export async function updateEmployeeRole(
  employeeId: string,
  role: 'employee' | 'admin' | 'super_admin'
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', employeeId)

  if (error) throw error

  revalidatePath('/admin/employees')
  return { success: true }
}

// Toggle employee active status
export async function toggleEmployeeActiveStatus(
  employeeId: string,
  isActive: boolean
) {
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('employees')
    .update({ is_active: isActive })
    .eq('id', employeeId)

  if (error) throw error

  revalidatePath('/admin/employees')
  return { success: true }
}

// Create new employee
export async function createEmployee(data: {
  email: string
  password: string
  full_name: string
  employee_no: string
  role: 'employee' | 'admin' | 'super_admin'
  department_id?: string
  designation_id?: string
  phone?: string
  policy_id?: string
}) {
  const adminClient = createAdminClient()

  // Create auth user using admin client
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })

  if (authError) throw authError

  if (!authData.user) throw new Error('Failed to create user')

  try {
    // Create profile using admin client to bypass RLS
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        phone: data.phone,
      })

    if (profileError) throw profileError

    // Create employee record using admin client to bypass RLS
    const employeeId = `EMP${Date.now().toString().slice(-6)}`
    const joiningDate = new Date()
    const { error: employeeError } = await adminClient
      .from('employees')
      .insert({
        id: authData.user.id,
        employee_id: employeeId,
        employee_no: data.employee_no,
        joining_date: joiningDate.toISOString().split('T')[0],
        department_id: data.department_id,
        designation_id: data.designation_id,
        policy_id: data.policy_id,
        policy_assigned_date: data.policy_id ? joiningDate.toISOString().split('T')[0] : null,
      })

    if (employeeError) throw employeeError

    // Initialize leave balance if policy is assigned
    if (data.policy_id) {
      const { initializeEmployeeLeaveBalance } = await import('./policy-actions')
      await initializeEmployeeLeaveBalance(authData.user.id, data.policy_id, joiningDate)
    }

    revalidatePath('/admin/employees')
    return { success: true, employeeId: authData.user.id }
  } catch (error) {
    // Rollback: delete auth user if profile/employee creation fails
    await adminClient.auth.admin.deleteUser(authData.user.id)
    throw error
  }
}

// Get all departments
export async function getDepartments() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('departments')
    .select('id, name, description')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

// Get all designations
export async function getDesignations() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('designations')
    .select('id, title, department_id')
    .order('title', { ascending: true })

  if (error) throw error
  return data
}

// Update employee (comprehensive update including policy)
export async function updateEmployee(
  employeeId: string,
  data: {
    full_name?: string
    phone?: string
    email?: string
    role?: 'employee' | 'admin' | 'super_admin'
    department_id?: string | null
    designation_id?: string | null
    policy_id?: string | null
  }
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Track if policy is being changed
  let policyChanged = false
  let oldPolicyId: string | null = null

  if (data.policy_id !== undefined) {
    // Check current policy
    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('policy_id')
      .eq('id', employeeId)
      .single()

    if (currentEmployee && currentEmployee.policy_id !== data.policy_id) {
      policyChanged = true
      oldPolicyId = currentEmployee.policy_id
    }
  }

  // Update profile if profile-related fields are provided
  if (data.full_name !== undefined || data.phone !== undefined || data.role !== undefined || data.email !== undefined) {
    const profileUpdate: any = {}
    if (data.full_name !== undefined) profileUpdate.full_name = data.full_name
    if (data.phone !== undefined) profileUpdate.phone = data.phone
    if (data.role !== undefined) profileUpdate.role = data.role
    if (data.email !== undefined) profileUpdate.email = data.email

    const { error: profileError } = await adminClient
      .from('profiles')
      .update(profileUpdate)
      .eq('id', employeeId)

    if (profileError) throw profileError
  }

  // Update employee record if employee-related fields are provided
  if (
    data.department_id !== undefined ||
    data.designation_id !== undefined ||
    data.policy_id !== undefined
  ) {
    const employeeUpdate: any = {}
    if (data.department_id !== undefined) employeeUpdate.department_id = data.department_id
    if (data.designation_id !== undefined) employeeUpdate.designation_id = data.designation_id
    if (data.policy_id !== undefined) {
      employeeUpdate.policy_id = data.policy_id
      employeeUpdate.policy_assigned_date = data.policy_id ? new Date().toISOString().split('T')[0] : null
    }

    const { error: employeeError } = await adminClient
      .from('employees')
      .update(employeeUpdate)
      .eq('id', employeeId)

    if (employeeError) throw employeeError
  }

  // Initialize or reinitialize leave balance if policy was changed
  if (policyChanged && data.policy_id) {
    const { initializeEmployeeLeaveBalance } = await import('./policy-actions')
    await initializeEmployeeLeaveBalance(employeeId, data.policy_id, new Date())
  }

  revalidatePath('/admin/employees')
  return { success: true }
}

// Update employee department/designation
export async function updateEmployeeTeam(
  employeeId: string,
  data: {
    department_id?: string | null
    designation_id?: string | null
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employees')
    .update(data)
    .eq('id', employeeId)

  if (error) throw error

  revalidatePath('/admin/employees')
  return { success: true }
}

// Delete employee
export async function deleteEmployee(employeeId: string) {
  const adminClient = createAdminClient()

  // This will cascade delete from employees table and auth.users
  const { error } = await adminClient.auth.admin.deleteUser(employeeId)

  if (error) throw error

  revalidatePath('/admin/employees')
  return { success: true }
}
