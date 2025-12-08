'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Get all designations with employee count
export async function getAllDesignationsWithStats() {
  const supabase = await createClient()

  const { data: designations, error } = await supabase
    .from('designations')
    .select(`
      id,
      title,
      description,
      level,
      department_id,
      created_at,
      department:departments(id, name)
    `)
    .order('title', { ascending: true })

  if (error) throw error

  // Get employee counts for each designation
  const designationsWithStats = await Promise.all(
    (designations || []).map(async (designation) => {
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('designation_id', designation.id)

      return {
        ...designation,
        employee_count: count || 0,
      }
    })
  )

  return designationsWithStats
}

// Create new designation
export async function createDesignation(data: {
  title: string
  description?: string
  department_id?: string
  level?: number
}) {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw new Error('Only admins can create designations')
  }

  const { error } = await supabase
    .from('designations')
    .insert({
      title: data.title,
      description: data.description,
      department_id: data.department_id || null,
      level: data.level || 1,
    })

  if (error) throw error

  revalidatePath('/admin/designations')
  return { success: true }
}

// Update designation
export async function updateDesignation(
  id: string,
  data: {
    title?: string
    description?: string
    department_id?: string | null
    level?: number
  }
) {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw new Error('Only admins can update designations')
  }

  const updateData: any = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.department_id !== undefined) updateData.department_id = data.department_id
  if (data.level !== undefined) updateData.level = data.level

  const { error } = await supabase
    .from('designations')
    .update(updateData)
    .eq('id', id)

  if (error) throw error

  revalidatePath('/admin/designations')
  revalidatePath('/admin/employees')
  return { success: true }
}

// Delete designation
export async function deleteDesignation(id: string) {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw new Error('Only admins can delete designations')
  }

  // Check if any employees are assigned to this designation
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('designation_id', id)

  if (count && count > 0) {
    throw new Error(`Cannot delete designation. ${count} employee(s) are assigned to this designation.`)
  }

  const { error } = await supabase
    .from('designations')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/admin/designations')
  return { success: true }
}

// Get employees by designation
export async function getEmployeesByDesignation(designationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      employee_id,
      profile:profiles!employees_id_fkey(
        id,
        full_name,
        email,
        avatar_url
      ),
      department:departments(id, name)
    `)
    .eq('designation_id', designationId)
    .order('employee_id', { ascending: true })

  if (error) throw error
  return data
}
