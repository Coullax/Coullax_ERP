import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DesignationsPageClient } from './designations-client'
import { getAllDesignationsWithStats } from '@/app/actions/designation-actions'
import { getDepartments } from '@/app/actions/employee-actions'

export default async function DesignationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        redirect('/')
    }

    const [designations, departments] = await Promise.all([
        getAllDesignationsWithStats(),
        getDepartments(),
    ])

    return (
        <DesignationsPageClient
            designations={designations}
            departments={departments}
        />
    )
}
