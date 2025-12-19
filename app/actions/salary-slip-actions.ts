'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSalarySlip(paymentId: string) {
    const supabase = createAdminClient()

    // Fetch payment with all related details
    // We need to fetch:
    // - Payment details (amounts, breakdown)
    // - Employee details (name, id, NIC, EPF)
    // - Department & Designation
    // - Salary Config (maybe for verification, but payment record should have the snapshot)

    const { data: payment, error } = await supabase
        .from('salary_payments')
        .select(`
      *,
      employee:employees!salary_payments_employee_id_fkey(
        id,
        employee_no,
        employee_id,
        joining_date,
        department:departments(name),
        designation:designations(title),
        profile:profiles!employees_id_fkey(
          full_name,
          email,
          phone
        )
      )
    `)
        .eq('id', paymentId)
        .single()

    if (error) {
        console.error('Error fetching salary slip:', error)
        return null
    }

    return payment
}


export async function disputeSalarySlip(paymentId: string, reason: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('salary_payments')
        .update({
            employee_status: 'disputed',
            dispute_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .eq('employee_id', (await supabase.auth.getUser()).data.user?.id)

    if (error) {
        console.error('Error disputing salary slip:', error)
        throw new Error('Failed to dispute salary slip')
    }

    revalidatePath(`/employee/salary/slip/${paymentId}`)
    return { success: true }
}

export async function approveSalarySlip(paymentId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('salary_payments')
        .update({
            employee_status: 'approved',
            employee_approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .eq('employee_id', (await supabase.auth.getUser()).data.user?.id) // Ensure only owner can approve

    if (error) {
        console.error('Error approving salary slip:', error)
        throw new Error('Failed to approve salary slip')
    }

    revalidatePath(`/employee/salary/slip/${paymentId}`)
    return { success: true }
}

export async function adminApproveSalarySlip(paymentId: string) {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        throw new Error("Forbidden");
    }

    const { error } = await supabase
        .from('salary_payments')
        .update({
            admin_approval_status: 'approved',
            admin_approved_at: new Date().toISOString(),
            admin_approved_by: user.id,
            status: 'paid', // Finalize as paid
            updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)

    if (error) {
        console.error('Error admin approving salary slip:', error)
        throw new Error('Failed to approve salary slip')
    }

    revalidatePath(`/employee/salary/slip/${paymentId}`)
    return { success: true }
}
