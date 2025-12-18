import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VisitorsClient } from './visitors-client'

export default async function VisitorsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Verify admin access
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        redirect('/employee')
    }

    // Fetch visitors
    const { data: visitors, error } = await supabase
        .from('visitors')
        .select(`
      *,
      host:host_employee_id (
        id,
        profile:profiles!employees_id_fkey (
          full_name,
          email,
          phone,
          avatar_url
        )
      )
    `)
        .order('scheduled_arrival', { ascending: true })

    if (error) {
        console.error('Error fetching visitors:', error)
    }

    // Fetch employees for the "Host" dropdown in Add Visitor dialog
    const { data: employees } = await supabase
        .from('employees')
        .select(`
      id,
      profile:profiles!employees_id_fkey(
        id,
        full_name,
        email
      )
    `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    // Transform employees data for the select
    const employeeOptions = employees?.map((emp: any) => ({
        id: emp.id,
        name: emp.profile?.full_name || 'Unknown',
        email: emp.profile?.email
    })) || []

    return (
        <VisitorsClient
            initialVisitors={visitors || []}
            employeeOptions={employeeOptions}
        />
    )
}
