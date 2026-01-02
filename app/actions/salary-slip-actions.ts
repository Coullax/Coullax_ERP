'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSalarySlip(paymentId: string) {
    const supabase = createAdminClient()

    // Fetch payment with all related details
    const { data: payment, error } = await supabase
        .from('salary_payments')
        .select(`
      *,
      employee:employees!salary_payments_employee_id_fkey(
        id,
        employee_no,
        employee_id,
        nic,
        joining_date,
        policy_id,
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

    // Get NIC directly from employee record
    const nicNumber = payment?.employee?.nic || null

    // Fetch attendance salary for the month
    let attendanceData = null
    if (payment?.employee?.id && payment?.month) {
        const monthStr = payment.month // YYYY-MM format
        const { data: attSalary } = await supabase
            .from('attendance_salary')
            .select('*')
            .eq('employee_id', payment.employee.id)
            .eq('month', monthStr + '-01')
            .maybeSingle()

        attendanceData = attSalary
    }

    // Fetch bank details
    let bankDetails = null
    if (payment?.employee?.id) {
        const { data: bank } = await supabase
            .from('bank_details')
            .select('bank_name, account_number')
            .eq('employee_id', payment.employee.id)
            .eq('status', 'verified')
            .maybeSingle()

        bankDetails = bank
    }

    // Fetch leave balance for the month
    let leaveBalance = null
    if (payment?.employee?.id && payment?.employee?.policy_id && payment?.month) {
        const monthDate = new Date(payment.month + '-01')
        const { data: balance } = await supabase
            .from('employee_leave_balance')
            .select('total_leaves, used_leaves, available_leaves')
            .eq('employee_id', payment.employee.id)
            .eq('policy_id', payment.employee.policy_id)
            .eq('month', monthDate.getMonth() + 1)
            .eq('year', monthDate.getFullYear())
            .maybeSingle()

        leaveBalance = balance
    }

    return {
        ...payment,
        nic_number: nicNumber,
        attendance_data: attendanceData,
        bank_details: bankDetails,
        leave_balance: leaveBalance,
    }
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
