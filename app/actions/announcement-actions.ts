'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Announcement = {
    id: string
    title: string
    content: string
    priority: 'low' | 'normal' | 'high' | 'critical'
    status: 'pending' | 'published'
    created_at: string
    created_by: string
}

export async function createAnnouncement(data: {
    title: string
    content: string
    priority: string
    status: string
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('announcements')
        .insert({
            ...data,
            created_by: (await supabase.auth.getUser()).data.user?.id,
        })

    if (error) throw error

    revalidatePath('/admin/announcements')
    revalidatePath('/employee') // Refresh employee dashboard to show new announcement if published
    return { success: true }
}

export async function getAllAnnouncements() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('announcements')
        .select(`
      *,
      creator:profiles!announcements_created_by_fkey(full_name)
    `)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function getActiveAnnouncements() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        // Limit to recent ones or top 5 to avoid cluttering dashboard
        .limit(5)

    if (error) throw error
    return data
}

export async function updateAnnouncementStatus(id: string, status: 'pending' | 'published') {
    const supabase = await createClient()

    const { error } = await supabase
        .from('announcements')
        .update({ status })
        .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/announcements')
    revalidatePath('/employee')
    return { success: true }
}

export async function deleteAnnouncement(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/announcements')
    revalidatePath('/employee')
    return { success: true }
}
