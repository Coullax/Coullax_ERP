"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// =====================================================
// Employee Category Assignment Actions
// =====================================================

export type EmployeeWithBaseSalary = {
    id: string;
    full_name: string;
    email: string;
    base_salary: number | null;
    current_total?: number;
};

export async function getEmployeesWithBaseSalary() {
    try {
        const supabase = await createClient();

        // Get all employees with their profile information
        const { data: employees, error: employeesError } = await supabase
            .from("employees")
            .select(`
                id,
                profile:profiles!employees_id_fkey(
                    full_name,
                    email
                )
            `)
            .order("created_at", { ascending: false });

        if (employeesError) throw employeesError;

        // Get base salary from salaries table for each employee
        const employeesWithSalary = await Promise.all(
            (employees || []).map(async (employee: any) => {
                const { data: salaryConfig } = await supabase
                    .from("salaries")
                    .select("base_amount")
                    .eq("employee_id", employee.id)
                    .maybeSingle();

                const baseSalary = salaryConfig?.base_amount || null;

                // Get all category assignments for this employee
                const { data: assignments } = await supabase
                    .from("employee_salary_category_assign")
                    .select(`
                        category_amount,
                        category:salary_categories!category_id(category_type)
                    `)
                    .eq("employee_id", employee.id);

                // Calculate current total salary
                let currentTotal = baseSalary || 0;
                if (assignments && assignments.length > 0) {
                    for (const assignment of assignments) {
                        const amount = assignment.category_amount || 0;
                        const categoryType = (assignment.category as any)?.category_type;

                        if (categoryType === "addition" || categoryType === "allowance") {
                            currentTotal += amount;
                        } else if (categoryType === "deduction") {
                            currentTotal -= amount;
                        }
                    }
                }

                // Handle profile - it's either an object or null
                const profile = employee.profile;

                return {
                    id: employee.id,
                    full_name: profile?.full_name || "Unknown",
                    email: profile?.email || "",
                    base_salary: baseSalary,
                    current_total: currentTotal,
                };
            })
        );

        return { success: true, data: employeesWithSalary as EmployeeWithBaseSalary[] };
    } catch (error: any) {
        console.error("Error fetching employees with base salary:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function getAssignedEmployeesByCategory(categoryId: string) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("employee_salary_category_assign")
            .select("employee_id")
            .eq("category_id", categoryId);

        if (error) throw error;

        const employeeIds = (data || []).map((item) => item.employee_id);
        return { success: true, data: employeeIds };
    } catch (error: any) {
        console.error("Error fetching assigned employees:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function assignEmployeesToCategory(
    categoryId: string,
    employeeIds: string[],
    categoryType: "addition" | "deduction" | "allowance",
    categoryAmounts: Record<string, number> = {}
) {
    try {
        const supabase = await createClient();

        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Get currently assigned employees for this category
        const { data: currentAssignments } = await supabase
            .from("employee_salary_category_assign")
            .select("employee_id")
            .eq("category_id", categoryId);

        const currentEmployeeIds = (currentAssignments || []).map((item) => item.employee_id);

        // Find employees to add (new selections)
        const toAdd = employeeIds.filter((id) => !currentEmployeeIds.includes(id));

        // Find employees to remove (deselected)
        const toRemove = currentEmployeeIds.filter((id) => !employeeIds.includes(id));

        // Insert new assignments with individual category amounts
        if (toAdd.length > 0) {
            const insertData = toAdd.map((employeeId) => ({
                employee_id: employeeId,
                category_id: categoryId,
                assigned_by: user.id,
                category_amount: categoryAmounts[employeeId] || 0,
            }));

            const { error: insertError } = await supabase
                .from("employee_salary_category_assign")
                .insert(insertData);

            if (insertError) throw insertError;
        }

        // Update existing assignments with new amounts
        const toUpdate = employeeIds.filter((id) => currentEmployeeIds.includes(id));
        if (toUpdate.length > 0) {
            for (const employeeId of toUpdate) {
                if (categoryAmounts[employeeId] !== undefined) {
                    await supabase
                        .from("employee_salary_category_assign")
                        .update({ category_amount: categoryAmounts[employeeId] })
                        .eq("category_id", categoryId)
                        .eq("employee_id", employeeId);
                }
            }
        }

        // Remove deselected assignments
        if (toRemove.length > 0) {
            const { error: deleteError } = await supabase
                .from("employee_salary_category_assign")
                .delete()
                .eq("category_id", categoryId)
                .in("employee_id", toRemove);

            if (deleteError) throw deleteError;
        }

        revalidatePath("/admin/salary/category-assign");
        return { success: true };
    } catch (error: any) {
        console.error("Error assigning employees to category:", error);
        return { success: false, error: error.message };
    }
}
