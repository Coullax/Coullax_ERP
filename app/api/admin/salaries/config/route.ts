import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const employee_id = searchParams.get('employee_id')
        const month = searchParams.get('month') // Get month parameter for attendance salary

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

        // Fetch all APIT ranges for calculation
        const { data: apitRanges, error: apitError } = await supabase
            .from('apit_ranges')
            .select('min_amount, max_amount, percentage')
            .order('min_amount', { ascending: true });

        if (apitError) {
            console.error('Error fetching APIT ranges:', apitError);
        }

        // For each employee, calculate detailed salary breakdown
        const employeesWithSalaryBreakdown = await Promise.all(
            (employees || []).map(async (employee: any) => {
                const baseSalary = employee.salary?.base_amount || 0;

                // Get attendance-based salary for the selected month
                let attendanceSalary = null;
                if (month) {
                    const monthDate = month + '-01';
                    const { data: attendanceData, error: attendanceError } = await supabase
                        .from('attendance_salary')
                        .select('calculated_amount')
                        .eq('employee_id', employee.id)
                        .eq('month', monthDate)
                        .maybeSingle();

                    if (attendanceError) {
                        console.error('Error fetching attendance salary:', attendanceError);
                    }

                    if (attendanceData?.calculated_amount !== null && attendanceData?.calculated_amount !== undefined) {
                        attendanceSalary = parseFloat(String(attendanceData.calculated_amount));
                    }
                }

                // Get all category assignments for this employee
                const { data: assignments } = await supabase
                    .from('employee_salary_category_assign')
                    .select(`
                        category_amount,
                        category:salary_categories!category_id(category_type)
                    `)
                    .eq('employee_id', employee.id);

                // Calculate category additions and deductions separately
                let categoryAdditions = 0;
                let categoryDeductions = 0;

                if (assignments && assignments.length > 0) {
                    for (const assignment of assignments) {
                        const amount = assignment.category_amount || 0;
                        const categoryType = (assignment.category as any)?.category_type;

                        if (categoryType === 'addition' || categoryType === 'allowance') {
                            categoryAdditions += amount;
                        } else if (categoryType === 'deduction') {
                            categoryDeductions += amount;
                        }
                    }
                }

                // Calculate APIT deduction based on base salary
                let apitDeduction = 0;
                let apitPercentage = 0;
                if (apitRanges && apitRanges.length > 0 && baseSalary > 0) {
                    // Find the matching APIT range for the base salary
                    const matchingRange = apitRanges.find(range => {
                        const minAmount = Number(range.min_amount) || 0;
                        const maxAmount = range.max_amount ? Number(range.max_amount) : Infinity;
                        return baseSalary >= minAmount && baseSalary <= maxAmount;
                    });

                    if (matchingRange) {
                        apitPercentage = Number(matchingRange.percentage) || 0;
                        apitDeduction = (baseSalary * apitPercentage) / 100;
                    }
                }

                const categoryNet = categoryAdditions - categoryDeductions;
                // Net Salary = Attendance Salary - APIT Deduction + Category Amount
                // Use attendance salary if available, otherwise fall back to base salary
                const salaryBase = attendanceSalary !== null ? attendanceSalary : baseSalary;
                const calculatedNetSalary = salaryBase - apitDeduction + categoryNet;

                return {
                    ...employee,
                    attendance_salary: attendanceSalary,
                    category_additions: categoryAdditions,
                    category_deductions: categoryDeductions,
                    category_net: categoryNet,
                    apit_deduction: apitDeduction,
                    apit_percentage: apitPercentage,
                    calculated_net_salary: calculatedNetSalary
                };
            })
        );

        // Log employees with attendance salary
        const employeesWithAttendance = employeesWithSalaryBreakdown.filter(emp => emp.attendance_salary !== null);
        console.log('=== Employees with attendance salary data ===');
        console.log(`Total employees: ${employeesWithSalaryBreakdown.length}`);
        console.log(`Employees with attendance data: ${employeesWithAttendance.length}`);
        employeesWithAttendance.forEach(emp => {
            console.log(`  - ${emp.employee_id}: ${emp.attendance_salary} LKR`);
        });

        return NextResponse.json({ employees: employeesWithSalaryBreakdown || [] })
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
