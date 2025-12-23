'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadToB2 } from './upload-actions'

export interface EmployeeHandbook {
    id: string
    title: string
    description: string | null
    file_url: string
    file_size: number | null
    version: string | null
    uploaded_by: string
    is_active: boolean
    created_at: string
    updated_at: string
    uploader?: {
        full_name: string
        email: string
    }
}

/**
 * Upload a new employee handbook PDF to Backblaze and store metadata in database
 */
export async function uploadEmployeeHandbook(formData: FormData) {
    try {
        const supabase = await createClient()

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if user is admin or super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Only admins can upload handbooks' }
        }

        const file = formData.get('file') as File
        const title = formData.get('title') as string
        const description = formData.get('description') as string
        const version = formData.get('version') as string

        if (!file || !title) {
            return { success: false, error: 'File and title are required' }
        }

        // Verify file is PDF
        if (file.type !== 'application/pdf') {
            return { success: false, error: 'Only PDF files are allowed' }
        }

        // Create unique filename
        const timestamp = Date.now()
        const filename = `handbooks/employee-handbook-${timestamp}.pdf`

        // Upload to Backblaze
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('filename', filename)

        const uploadResult = await uploadToB2(uploadFormData)

        if (!uploadResult.success || !uploadResult.publicUrl) {
            return {
                success: false,
                error: uploadResult.error || 'Failed to upload file to storage',
            }
        }

        // Store metadata in database
        const { data, error } = await supabase
            .from('employee_handbooks')
            .insert({
                title,
                description: description || null,
                file_url: uploadResult.publicUrl,
                file_size: file.size,
                version: version || null,
                uploaded_by: user.id,
                is_active: true,
            })
            .select()
            .single()

        if (error) {
            console.error('Database error:', error)
            return { success: false, error: 'Failed to save handbook metadata' }
        }

        revalidatePath('/profile')
        revalidatePath('/admin/employees')

        return { success: true, data }
    } catch (error) {
        console.error('Upload handbook error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed',
        }
    }
}

/**
 * Get the latest active employee handbook for employees to view
 */
export async function getLatestHandbook() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('employee_handbooks')
            .select(
                `
        *,
        uploader:uploaded_by (
          full_name,
          email
        )
      `
            )
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No handbook found
                return { success: true, data: null }
            }
            console.error('Get latest handbook error:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (error) {
        console.error('Get latest handbook error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch handbook',
        }
    }
}

/**
 * Get all employee handbooks (admin only)
 */
export async function getAllHandbooks() {
    try {
        const supabase = await createClient()

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if user is admin or super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Only admins can view all handbooks' }
        }

        const { data, error } = await supabase
            .from('employee_handbooks')
            .select(
                `
        *,
        uploader:uploaded_by (
          full_name,
          email
        )
      `
            )
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Get all handbooks error:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (error) {
        console.error('Get all handbooks error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch handbooks',
        }
    }
}

/**
 * Toggle handbook active status
 */
export async function updateHandbookStatus(handbookId: string, isActive: boolean) {
    try {
        const supabase = await createClient()

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if user is admin or super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Only admins can update handbooks' }
        }

        const { error } = await supabase
            .from('employee_handbooks')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', handbookId)

        if (error) {
            console.error('Update handbook status error:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/profile')
        revalidatePath('/admin/employees')

        return { success: true }
    } catch (error) {
        console.error('Update handbook status error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update handbook',
        }
    }
}

/**
 * Delete an employee handbook
 */
export async function deleteHandbook(handbookId: string) {
    try {
        const supabase = await createClient()

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if user is admin or super admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Only admins can delete handbooks' }
        }

        const { error } = await supabase
            .from('employee_handbooks')
            .delete()
            .eq('id', handbookId)

        if (error) {
            console.error('Delete handbook error:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/profile')
        revalidatePath('/admin/employees')

        return { success: true }
    } catch (error) {
        console.error('Delete handbook error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete handbook',
        }
    }
}
