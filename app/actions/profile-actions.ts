'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getEmployeeProfile(userId: string) {
  const supabase = await createClient()
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select(`
      *,
      department:departments(id, name),
      designation:designations(id, title),
      supervisor:profiles!employees_supervisor_id_fkey(id, full_name)
    `)
    .eq('id', userId)
    .single()

  return {
    profile,
    employee,
  }
}

export async function updateProfile(userId: string, data: {
  full_name?: string
  phone?: string
  avatar_url?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/profile')
  return { success: true }
}

export async function updateEmployeeInfo(userId: string, data: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employees')
    .update(data)
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/profile')
  return { success: true }
}

export async function getEmployeeEducation(employeeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employee_education')
    .select('*')
    .eq('employee_id', employeeId)
    .order('end_year', { ascending: false })

  if (error) throw error
  return data
}

export async function addEducation(employeeId: string, education: {
  degree: string
  institution: string
  field_of_study?: string
  start_year?: number
  end_year?: number
  grade?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employee_education')
    .insert({
      employee_id: employeeId,
      ...education,
    })

  if (error) throw error

  revalidatePath('/profile')
  return { success: true }
}

export async function deleteEducation(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employee_education')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/profile')
  return { success: true }
}

export async function getEmployeeSkills(employeeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employee_skills')
    .select('*')
    .eq('employee_id', employeeId)
    .order('proficiency_level', { ascending: false })

  if (error) throw error
  return data
}

export async function addSkill(employeeId: string, skill: {
  skill_name: string
  proficiency_level: number
  years_of_experience?: number
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employee_skills')
    .insert({
      employee_id: employeeId,
      ...skill,
    })

  if (error) throw error

  revalidatePath('/profile')
  return { success: true }
}

export async function deleteSkill(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('employee_skills')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/profile')
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('file') as File
  const userId = formData.get('userId') as string

  if (!file) throw new Error('No file provided')

  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  // Update profile with new avatar URL
  await updateProfile(userId, { avatar_url: data.publicUrl })

  return { url: data.publicUrl }
}
