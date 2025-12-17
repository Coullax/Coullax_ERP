import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const employee_id = searchParams.get('employee_id')

        // Get current user and verify admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Build query
        let query = supabase
            .from('employees')
            .select(`
        id,
        employee_id,
        profiles:profiles!employees_id_fkey(full_name, avatar_url, email),
        department:departments!employees_department_id_fkey(name),
        designation:designations!employees_designation_id_fkey(title),
        salary:salaries(*)
      `)

        if (employee_id) {
            query = query.eq('id', employee_id)
        }

        const { data: employees, error } = await query

        if (error) {
            console.error('Error fetching salary configs:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ employees: employees || [] })
    } catch (error: any) {
        console.error('Error in GET admin salary config:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const { employee_id, base_amount, currency, effective_date, recurring_allowances, recurring_deductions } = body

        // Get current user and verify admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Upsert salary config
        const { data: salary, error } = await supabase
            .from('salaries')
            .upsert({
                employee_id,
                base_amount,
                currency: currency || 'LKR',
                effective_date: effective_date || new Date().toISOString(),
                recurring_allowances: recurring_allowances || [],
                recurring_deductions: recurring_deductions || [],
                updated_at: new Date().toISOString()
            }, { onConflict: 'employee_id' })
            .select()
            .single()

        if (error) {
            console.error('Error updating salary config:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Audit Log (Manual if trigger doesn't cover everything context-wise, but we have triggers)

        return NextResponse.json({ salary })
    } catch (error: any) {
        console.error('Error in POST admin salary config:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
