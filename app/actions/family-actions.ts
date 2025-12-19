'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function getCoullaxFamily() {
    const adminClient = createAdminClient()

    const { data: employees, error } = await adminClient
        .from('employees')
        .select(`
      id,
      department:departments(id, name),
      designation:designations(id, title),
      profile:profiles!employees_id_fkey(
        id,
        full_name,
        email,
        avatar_url,
        phone
      )
    `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching Coullax Family:', error)
        throw new Error('Failed to fetch Coullax Family data')
    }

    // Transform data to ensure single objects for relations
    const formattedEmployees = employees?.map((emp: any) => ({
        id: emp.id,
        department: Array.isArray(emp.department) ? emp.department[0] : emp.department,
        designation: Array.isArray(emp.designation) ? emp.designation[0] : emp.designation,
        profile: Array.isArray(emp.profile) ? emp.profile[0] : emp.profile,
    }))

    return formattedEmployees || []
}
