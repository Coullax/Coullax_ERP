import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch salary history for the logged-in employee
        // Only show PAID records (and possibly draft if we want, but schema policy says paid)
        // Actually policy says: status = 'paid'. 
        // We might want to see 'pending' if pending means 'waiting for employee approval'?
        // The schema update added 'employee_status' column, but the row status is 'status'. 
        // Admin sets 'status' => 'paid' (meaning processed/finalized).
        // Then employee sees it and updates 'employee_status' => 'approved'/'disputed'.

        const { data: payments, error } = await supabase
            .from('salary_payments')
            .select('*')
            .eq('employee_id', user.id)
            .eq('status', 'paid') // Only visible if processed by admin
            .order('month', { ascending: false })

        if (error) {
            console.error('Error fetching employee salaries:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ payments: payments || [] })
    } catch (error: any) {
        console.error('Error in GET employee salaries:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
