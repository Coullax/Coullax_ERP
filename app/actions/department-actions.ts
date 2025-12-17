'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Get all departments with relationships
export async function getDepartmentsData() {
  const supabase = await createClient()

  const { data: departments, error } = await supabase
    .from('departments')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error

  // Get additional relationships separately to avoid FK hint issues
  const departmentsWithRelations = await Promise.all(
    (departments || []).map(async (dept) => {
      // Get head info
      const head = dept.head_id
        ? await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', dept.head_id)
          .single()
          .then(({ data }) => data)
        : null

      // Get parent info
      const parent = dept.parent_id
        ? await supabase
          .from('departments')
          .select('id, name')
          .eq('id', dept.parent_id)
          .single()
          .then(({ data }) => data)
        : null

      // Get employee count
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', dept.id)

      return {
        ...dept,
        head,
        parent,
        employee_count: count || 0,
      }
    })
  )

  return departmentsWithRelations
}

// Get all users for department head selection
export async function getAllUsers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name', { ascending: true })

  if (error) throw error
  return data
}

// Create new department
export async function createDepartment(data: {
  name: string
  description?: string
  head_id?: string
  parent_id?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('departments')
    .insert({
      name: data.name,
      description: data.description,
      head_id: data.head_id || null,
      parent_id: data.parent_id || null,
    })

  if (error) throw error

  // Update the department head's role based on whether it's a root department or sub-department
  if (data.head_id) {
    const adminClient = createAdminClient()
    // If parent_id is null/undefined, it's a root department -> DepartmentHead
    // If parent_id exists, it's a sub-department -> TeamLead
    const role = !data.parent_id ? 'DepartmentHead' : 'TeamLead'

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', data.head_id)

    if (updateError) throw updateError
  }

  revalidatePath('/super-admin/departments')
  return { success: true }
}

// Update department
export async function updateDepartment(
  departmentId: string,
  data: {
    name?: string
    description?: string
    head_id?: string | null
    parent_id?: string | null
  }
) {
  const supabase = await createClient()

  // Get the current department head and parent before updating
  const { data: currentDept } = await supabase
    .from('departments')
    .select('head_id, parent_id')
    .eq('id', departmentId)
    .single()

  const oldHeadId = currentDept?.head_id

  // Update the department
  const { error } = await supabase
    .from('departments')
    .update(data)
    .eq('id', departmentId)

  if (error) throw error

  // Handle role changes for department heads
  if (data.head_id !== undefined) {
    // If the new head is different from the old head
    if (data.head_id !== oldHeadId) {
      // Update new head's role based on parent_id if a new head is assigned
      if (data.head_id) {
        const adminClient = createAdminClient()
        // Determine the role based on parent_id
        // If parent_id is explicitly set in data, use it; otherwise keep checking the department's parent_id
        const parentId = data.parent_id !== undefined ? data.parent_id : currentDept?.parent_id
        const role = !parentId ? 'DepartmentHead' : 'TeamLead'

        const { error: updateError } = await adminClient
          .from('profiles')
          .update({ role })
          .eq('id', data.head_id)

        if (updateError) throw updateError
      }

      // Revert old head's role to 'employee' if they're no longer head of any department
      if (oldHeadId) {
        const { count } = await supabase
          .from('departments')
          .select('*', { count: 'exact', head: true })
          .eq('head_id', oldHeadId)

        // If the old head is not a head of any other department, revert to 'employee'
        if (count === 0) {
          const adminClient = createAdminClient()
          const { error: revertError } = await adminClient
            .from('profiles')
            .update({ role: 'employee' })
            .eq('id', oldHeadId)

          if (revertError) throw revertError
        }
      }
    }
  }

  revalidatePath('/super-admin/departments')
  return { success: true }
}

// Delete department
export async function deleteDepartment(departmentId: string) {
  const supabase = await createClient()

  // Get the department to find its head
  const { data: department } = await supabase
    .from('departments')
    .select('head_id')
    .eq('id', departmentId)
    .single()

  // Check if department has employees
  const { count } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', departmentId)

  if (count && count > 0) {
    throw new Error('Cannot delete department with employees. Please reassign employees first.')
  }

  // Check if department has child departments
  const { count: childCount } = await supabase
    .from('departments')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', departmentId)

  if (childCount && childCount > 0) {
    throw new Error('Cannot delete department with sub-departments. Please delete or reassign sub-departments first.')
  }

  // Delete the department
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', departmentId)

  if (error) throw error

  // Revert the head's role to 'employee' if they're no longer head of any department
  if (department?.head_id) {
    const { count: remainingDepts } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('head_id', department.head_id)

    // If they're not heading any other department, revert to employee
    if (remainingDepts === 0) {
      const adminClient = createAdminClient()
      const { error: revertError } = await adminClient
        .from('profiles')
        .update({ role: 'employee' })
        .eq('id', department.head_id)

      if (revertError) throw revertError
    }
  }

  revalidatePath('/super-admin/departments')
  return { success: true }
}
