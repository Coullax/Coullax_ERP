import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { id } = params
        const body = await request.json()
        const { action, reason } = body // action: 'approve' | 'dispute'

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['approve', 'dispute'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        const employeeStatus = action === 'approve' ? 'approved' : 'disputed'

        // Update the payment record
        // RLS policy "Employees can acknowledge own salary payments" should allow this
        const { data, error } = await supabase
            .from('salary_payments')
            .update({
                employee_status: employeeStatus,
                dispute_reason: action === 'dispute' ? reason : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('employee_id', user.id) // Security check
            .select()
            .single()

        if (error) {
            console.error('Error updating salary acknowledgement:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ payment: data })
    } catch (error: any) {
        console.error('Error in salary acknowledgement:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
