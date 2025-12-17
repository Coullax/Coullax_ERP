import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SalaryComponent } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const month = searchParams.get('month')
        const employee_id = searchParams.get('employee_id')

        // Auth & Permission Check
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

        let query = supabase
            .from('salary_payments')
            .select(`
        *,
        employee:employees!salary_payments_employee_id_fkey(
          id,
          employee_id,
          profiles:profiles!employees_id_fkey(full_name, avatar_url),
          department:departments!employees_department_id_fkey(name),
          designation:designations!employees_designation_id_fkey(title)
        )
      `)
            .order('month', { ascending: false })

        if (month) query = query.eq('month', month)
        if (employee_id) query = query.eq('employee_id', employee_id)

        const { data: payments, error } = await query

        if (error) {
            throw error
        }

        return NextResponse.json({ payments: payments || [] })
    } catch (error: any) {
        console.error('Error fetching salary payments:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const { employee_id, month, additions, deductions, status, notes } = body

        // Auth Check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 1. Fetch Salary Config
        const { data: config, error: configError } = await supabase
            .from('salaries')
            .select('*')
            .eq('employee_id', employee_id)
            .single()

        if (configError || !config) {
            return NextResponse.json({ error: 'Salary configuration not found for this employee' }, { status: 404 })
        }

        const base_amount = Number(config.base_amount)

        // 2. Calculate Totals
        // Additions = Recurring Allowances + One-time Additions (Bonus)
        const recurringAllowances = (config.recurring_allowances as SalaryComponent[]) || []
        const oneTimeAdditions = (additions as SalaryComponent[]) || []
        const allAdditions = [...recurringAllowances, ...oneTimeAdditions] // Store both in payment record for immutability? Or just the one-times? 
        // Ideally we snapshot everything into the payment record. 
        // However, the input 'additions' might already include everything if the frontend handles it, or just extras.
        // Let's assume the frontend sends the *final* list of additions/deductions to be saved.
        // BUT, for a "Process" action, likely we start with defaults.
        // Let's assume the Body contains text-confirmed arrays. If not, we might need to merge.
        // For simplicity: The API trusts the passed `additions` and `deductions` arrays as the FINAL breakdown for this month.
        // The Frontend should have pre-populated them from config.

        // Total Additions
        const totalAdditions = (additions as SalaryComponent[]).reduce((sum, item) => sum + Number(item.amount), 0)

        // Total Deductions
        const totalDeductions = (deductions as SalaryComponent[]).reduce((sum, item) => sum + Number(item.amount), 0)

        const gross_amount = base_amount + totalAdditions
        const net_amount = gross_amount - totalDeductions

        // 3. Save to salary_payments
        const { data: payment, error: saveError } = await supabase
            .from('salary_payments')
            .upsert({
                employee_id,
                month,
                base_amount,
                gross_amount,
                net_amount,
                additions: additions || [],
                deductions: deductions || [],
                status: status || 'draft',
                employee_status: 'pending', // Reset status on update/re-process
                dispute_reason: null, // Clear dispute reason on update
                notes,
                created_by: user.id,
                updated_at: new Date().toISOString()
                // payment_date is set when status converts to paid? Or passed in.
            }, { onConflict: 'employee_id, month' })
            .select()
            .single()

        if (saveError) throw saveError

        return NextResponse.json({ payment })

    } catch (error: any) {
        console.error('Error processing salary:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
