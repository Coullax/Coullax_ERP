import { createClient } from "@/lib/supabase/server";
import { SalarySlipClient } from "./salary-slip-client";
import { notFound, redirect } from "next/navigation";

export default async function SalarySlipPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();

    // 1. Check Auth (Any logged in user can try, but data fetching limits access)
    // Actually, for the *link* to work for the employee, they must be logged in.
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login?next=/employee/salary/slip/' + params.id);
    }

    // 2. Fetch Slip Data (Reuse the server action logic or call it directly? 
    // Best to call the server action or reuse the fetch logic to keep it DRY, 
    // but here we can just fetch.
    // However, we need to allow admins to view it too.
    // The previous implementation used `getSalarySlip` action.

    // Let's import the action.
    const { getSalarySlip } = await import('@/app/actions/salary-slip-actions');
    const payment = await getSalarySlip(params.id);

    if (!payment) {
        return notFound();
    }

    // 3. Security Check: Access Control
    // Allow if:
    // a) User is the owner (employee_id matches user.id? No, employee_id in payment is GUID of employee table)
    //    We need to map user.id -> employee record -> check against payment.employee_id
    // b) User is Admin/SuperAdmin

    // Fetch User Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = profile?.role;

    const isOwner = payment.employee?.profile?.email === user.email; // Basic check via email or we check IDs.
    // Better ID check:
    // payment.employee.employee_id (This is the custom ID string like EMP001).
    // The payment.employee_id is the UUID foreign key to employees table.
    // We need to check if that employee row is owned by the current user. 
    // Usually employees table has profile_id or simply link via email.
    // Our schema used profiles!employees_id_fkey. 
    // So payment.employee.profile.id should match user.id?

    // Let's check the structure returned by `getSalarySlip`.
    // It returns `employee.profile` which has email but maybe not ID if we didn't select it.
    // In action: profile:profiles!employees_id_fkey(full_name, email, phone) -> No ID selected?
    // Wait, the action `getSalarySlip` selects:
    // profile:profiles!employees_id_fkey(full_name, email, phone)
    // It does NOT select ID.

    // But we can check email.
    const isOwnerByEmail = payment.employee?.profile?.email === user.email;
    const isAdmin = ['admin', 'super_admin'].includes(role || '');

    if (!isOwnerByEmail && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold text-red-600">Unauthorized</h1>
                <p>You do not have permission to view this salary slip.</p>
            </div>
        );
    }

    return <SalarySlipClient payment={payment} />;
}
