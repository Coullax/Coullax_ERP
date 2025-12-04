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
      joining_date,
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

// Create new employee
export async function createEmployee(data: {
  email: string
  password: string
  full_name: string
  role: 'employee' | 'admin' | 'super_admin'
  department_id?: string
  designation_id?: string
  phone?: string
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
    const { error: employeeError } = await adminClient
      .from('employees')
      .insert({
        id: authData.user.id,
        employee_id: employeeId,
        joining_date: new Date().toISOString().split('T')[0],
        department_id: data.department_id,
        designation_id: data.designation_id,
      })

    if (employeeError) throw employeeError

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
