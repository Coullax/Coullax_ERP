"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface OvertimeRequest {
    id: string;
    request_id: string;
    employee_id: string;
    date: string;
    hours: number;
    reason: string;
    employee: {
        id: string;
        employee_id: string;
        profile: {
            full_name: string;
            email: string;
            avatar_url?: string;
        };
    };
    request: {
        status: string;
        submitted_at: string;
    };
    approval?: {
        id: string;
        calculated_amount: number;
        approved_at: string;
        month: string;
    };
}

export interface OvertimeSalaryApproval {
    id: string;
    overtime_request_id: string;
    employee_id: string;
    calculated_amount: number;
    month: string;
    approved_at: string;
    approved_by: string;
}

/**
 * Get all approved overtime requests that haven't been marked for salary calculation yet
 */
export async function getApprovedOvertimeRequests(month?: string) {
    try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminClient = createAdminClient();

        let query = adminClient
            .from("overtime_requests")
            .select(`
                *,
                request:requests!overtime_requests_request_id_fkey (
                    status,
                    submitted_at
                ),
                employee:employees!overtime_requests_employee_id_fkey (
                    id,
                    employee_id,
                    profile:profiles!employees_id_fkey (
                        full_name,
                        email,
                        avatar_url
                    )
                )
            `)
            .eq("request.status", "approved");

        // If month is specified, filter by date
        if (month) {
            const [year, monthNum] = month.split("-");
            const startDate = `${year}-${monthNum}-01`;
            const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split("T")[0];
            query = query.gte("date", startDate).lte("date", endDate);
        }

        const { data, error } = await query.order("date", { ascending: false });

        if (error) {
            console.error("Error fetching approved overtime requests:", error);
            return { success: false, error: error.message, data: [] };
        }

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("Error in getApprovedOvertimeRequests:", error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get employees with their overtime requests for a specific month
 */
export async function getEmployeesWithOvertimeRequests(month: string) {
    try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminClient = createAdminClient();

        const [year, monthNum] = month.split("-");
        const startDate = `${year}-${monthNum}-01`;
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split("T")[0];

        const { data: overtimeRequests, error } = await adminClient
            .from("overtime_requests")
            .select(`
                *,
                request:requests!overtime_requests_request_id_fkey (
                    status,
                    submitted_at
                ),
                employee:employees!overtime_requests_employee_id_fkey (
                    id,
                    employee_id,
                    profile:profiles!employees_id_fkey (
                        full_name,
                        email,
                        avatar_url
                    ),
                    salary:salaries (
                        base_amount
                    )
                ),
                approval:overtime_salary_approvals!overtime_salary_approvals_overtime_request_id_fkey (
                    id,
                    calculated_amount,
                    approved_at,
                    month
                )
            `)
            .eq("request.status", "approved")
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false });

        if (error) {
            console.error("Error fetching employees with overtime:", error);
            return { success: false, error: error.message, data: [] };
        }

        return { success: true, data: overtimeRequests || [] };
    } catch (error: any) {
        console.error("Error in getEmployeesWithOvertimeRequests:", error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Calculate overtime amount using formula: (base_amount / 240) * hours * 1.5
 */
export async function calculateOvertimeAmount(employeeId: string, hours: number) {
    try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminClient = createAdminClient();

        // Get employee's base salary
        const { data: salary, error } = await adminClient
            .from("salaries")
            .select("base_amount")
            .eq("employee_id", employeeId)
            .single();

        if (error || !salary) {
            return { success: false, error: "Employee salary not found", amount: 0 };
        }

        // Calculate: (base_amount / 240) * hours * 1.5
        const baseAmount = Number(salary.base_amount);
        const calculatedAmount = (baseAmount / 240) * hours * 1.5;

        return { success: true, amount: Math.round(calculatedAmount * 100) / 100 };
    } catch (error: any) {
        console.error("Error calculating overtime amount:", error);
        return { success: false, error: error.message, amount: 0 };
    }
}

/**
 * Approve overtime requests for salary calculation
 */
export async function approveOvertimeForSalary(
    overtimeRequestIds: string[],
    month: string,
    approvedBy: string
) {
    try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminClient = createAdminClient();

        // Get overtime requests
        const { data: overtimeRequests, error: fetchError } = await adminClient
            .from("overtime_requests")
            .select("id, employee_id, hours")
            .in("id", overtimeRequestIds);

        if (fetchError || !overtimeRequests) {
            return { success: false, error: "Failed to fetch overtime requests" };
        }

        // Get employee IDs
        const employeeIds = overtimeRequests.map(ot => ot.employee_id);

        // Fetch base salaries for all employees
        const { data: salaries, error: salaryError } = await adminClient
            .from("salaries")
            .select("employee_id, base_amount")
            .in("employee_id", employeeIds);

        if (salaryError) {
            console.error("Error fetching salaries:", salaryError);
            return { success: false, error: "Failed to fetch employee salaries" };
        }

        // Create a map of employee_id to base_amount
        const salaryMap = new Map<string, number>();
        salaries?.forEach(s => {
            if (s.base_amount) {
                salaryMap.set(s.employee_id, Number(s.base_amount));
            }
        });

        // Calculate and prepare approval records
        const approvals = [];
        const skippedEmployees: string[] = [];

        for (const ot of overtimeRequests) {
            const baseSalary = salaryMap.get(ot.employee_id);

            if (!baseSalary) {
                console.warn(`No base salary found for employee ${ot.employee_id}`);
                skippedEmployees.push(ot.employee_id);
                continue;
            }

            const calculatedAmount = (baseSalary / 240) * ot.hours * 1.5;

            approvals.push({
                overtime_request_id: ot.id,
                employee_id: ot.employee_id,
                approved_by: approvedBy,
                calculated_amount: Math.round(calculatedAmount * 100) / 100,
                month: month,
            });
        }

        if (approvals.length === 0) {
            return {
                success: false,
                error: skippedEmployees.length > 0
                    ? `No valid overtime requests to approve. ${skippedEmployees.length} employee(s) are missing base salary configuration.`
                    : "No valid overtime requests to approve"
            };
        }

        // Insert approvals (upsert to handle re-calculations)
        const { data, error: insertError } = await adminClient
            .from("overtime_salary_approvals")
            .upsert(approvals, {
                onConflict: "overtime_request_id,month",
                ignoreDuplicates: false,
            })
            .select();

        if (insertError) {
            console.error("Error inserting overtime approvals:", insertError);
            return { success: false, error: insertError.message };
        }

        // Get the Overtime category from salary_categories (case-insensitive search)
        const { data: overtimeCategory, error: categoryFetchError } = await adminClient
            .from("salary_categories")
            .select("id")
            .ilike("name", "overtime")
            .maybeSingle();

        if (categoryFetchError) {
            console.error("Error fetching overtime category:", categoryFetchError);
            return { success: false, error: "Failed to fetch overtime category" };
        }

        if (!overtimeCategory) {
            console.error("Overtime category not found in salary_categories table");
            return { success: false, error: "Overtime category not found. Please create an 'Overtime' category in salary setup." };
        }

        const overtimeCategoryId = overtimeCategory.id;

        // Insert or update employee_salary_category_assign records for each approved overtime
        for (const approval of approvals) {
            try {
                // Check if this employee already has an overtime assignment
                const { data: existingAssignment } = await adminClient
                    .from("employee_salary_category_assign")
                    .select("id")
                    .eq("employee_id", approval.employee_id)
                    .eq("category_id", overtimeCategoryId)
                    .maybeSingle();

                if (existingAssignment) {
                    // Update existing assignment
                    const { error: updateError } = await adminClient
                        .from("employee_salary_category_assign")
                        .update({
                            category_amount: approval.calculated_amount,
                        })
                        .eq("id", existingAssignment.id);

                    if (updateError) {
                        console.warn(`Could not update overtime assignment for employee ${approval.employee_id}:`, updateError);
                    }
                } else {
                    // Insert new assignment
                    const { error: insertAssignmentError } = await adminClient
                        .from("employee_salary_category_assign")
                        .insert({
                            employee_id: approval.employee_id,
                            category_id: overtimeCategoryId,
                            category_amount: approval.calculated_amount,
                            assigned_by: approvedBy,
                        });

                    if (insertAssignmentError) {
                        console.warn(`Could not insert overtime assignment for employee ${approval.employee_id}:`, insertAssignmentError);
                    }
                }
            } catch (assignmentError) {
                console.error(`Error managing overtime assignment for employee ${approval.employee_id}:`, assignmentError);
            }
        }

        revalidatePath("/admin/salary/category-assign");
        revalidatePath("/admin/salary");
        revalidatePath("/admin/salary/config");

        // Return success with warning if some were skipped
        const message = skippedEmployees.length > 0
            ? `Approved ${approvals.length} overtime request(s). ${skippedEmployees.length} employee(s) skipped due to missing base salary.`
            : undefined;

        return { success: true, data, message };
    } catch (error: any) {
        console.error("Error in approveOvertimeForSalary:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get approved overtime for an employee in a specific month
 */
export async function getApprovedOvertimeByEmployee(employeeId: string, month: string) {
    try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminClient = createAdminClient();

        const { data, error } = await adminClient
            .from("overtime_salary_approvals")
            .select(`
                *,
                overtime_request:overtime_requests!overtime_salary_approvals_overtime_request_id_fkey (
                    date,
                    hours,
                    reason
                )
            `)
            .eq("employee_id", employeeId)
            .eq("month", month);

        if (error) {
            console.error("Error fetching approved overtime:", error);
            return { success: false, error: error.message, data: [] };
        }

        // Calculate total
        const totalAmount = data?.reduce((sum, item) => sum + Number(item.calculated_amount), 0) || 0;
        const totalHours = data?.reduce((sum, item) => sum + Number(item.overtime_request?.hours || 0), 0) || 0;

        return {
            success: true,
            data: data || [],
            totalAmount: Math.round(totalAmount * 100) / 100,
            totalHours,
        };
    } catch (error: any) {
        console.error("Error in getApprovedOvertimeByEmployee:", error);
        return { success: false, error: error.message, data: [], totalAmount: 0, totalHours: 0 };
    }
}

/**
 * Remove overtime approval (undo)
 */
export async function removeOvertimeApproval(approvalId: string) {
    try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminClient = createAdminClient();

        // First, get the approval details before deleting
        const { data: approval, error: fetchError } = await adminClient
            .from("overtime_salary_approvals")
            .select("employee_id, month")
            .eq("id", approvalId)
            .single();

        if (fetchError || !approval) {
            console.error("Error fetching overtime approval:", fetchError);
            return { success: false, error: "Approval not found" };
        }

        // Delete the approval
        const { error } = await adminClient
            .from("overtime_salary_approvals")
            .delete()
            .eq("id", approvalId);

        if (error) {
            console.error("Error removing overtime approval:", error);
            return { success: false, error: error.message };
        }

        // Remove the overtime assignment from employee_salary_category_assign
        try {
            // Get the Overtime category ID (case-insensitive search)
            const { data: overtimeCategory } = await adminClient
                .from("salary_categories")
                .select("id")
                .ilike("name", "overtime")
                .maybeSingle();

            if (overtimeCategory) {
                await adminClient
                    .from("employee_salary_category_assign")
                    .delete()
                    .eq("employee_id", approval.employee_id)
                    .eq("category_id", overtimeCategory.id);
            }
        } catch (assignmentDeleteError) {
            console.warn("Error removing overtime assignment:", assignmentDeleteError);
        }

        revalidatePath("/admin/salary/category-assign");
        revalidatePath("/admin/salary");
        revalidatePath("/admin/salary/config");

        return { success: true };
    } catch (error: any) {
        console.error("Error in removeOvertimeApproval:", error);
        return { success: false, error: error.message };
    }
}
