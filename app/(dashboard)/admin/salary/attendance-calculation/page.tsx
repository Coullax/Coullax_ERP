"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Calculator, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getEmployeesForAttendanceSalary } from "@/app/actions/attendance-salary-actions";
import { AttendanceCalculationDialog } from "@/components/admin/salary/attendance-calculation-dialog";

type Employee = {
    id: string;
    employee_id: string;
    full_name: string;
    email: string;
    base_salary: number | null;
};

export default function AttendanceCalculationPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const result = await getEmployeesForAttendanceSalary();
            if (result.success) {
                setEmployees(result.data || []);
            } else {
                setError(result.error || "Failed to load employees");
            }
        } catch (err) {
            setError("An unexpected error occurred");
            console.error("Error loading employees:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (employee: Employee) => {
        setSelectedEmployee(employee);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedEmployee(null);
    };

    // Filter employees based on search query
    const filteredEmployees = employees.filter((employee) => {
        const query = searchQuery.toLowerCase();
        return (
            employee.full_name.toLowerCase().includes(query) ||
            employee.email.toLowerCase().includes(query) ||
            employee.employee_id.toLowerCase().includes(query)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading employees...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Attendance Salary Calculation
                </h1>
                <p className="text-muted-foreground mt-1">
                    Calculate and manage attendance-based salary information for employees
                </p>
            </div>

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{employees.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Active employees in system
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            With Base Salary
                        </CardTitle>
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {employees.filter((e) => e.base_salary !== null).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Employees with configured salary
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Filtered Results
                        </CardTitle>
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredEmployees.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Matching search criteria
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Employee List</CardTitle>
                    <CardDescription>
                        Select an employee to calculate attendance-based salary
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or employee ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Employee Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Base Salary</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            {searchQuery
                                                ? "No employees match your search criteria"
                                                : "No employees found"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEmployees.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">
                                                {employee.employee_id}
                                            </TableCell>
                                            <TableCell>{employee.full_name}</TableCell>
                                            <TableCell>{employee.email}</TableCell>
                                            <TableCell className="text-right">
                                                {employee.base_salary !== null ? (
                                                    <Badge variant="secondary">
                                                        LKR{" "}
                                                        {employee.base_salary.toLocaleString()}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">Not Set</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(employee)}
                                                >
                                                    <Calculator className="w-4 h-4 mr-2" />
                                                    Configure
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog */}
            <AttendanceCalculationDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                employee={selectedEmployee}
            />
        </div>
    );
}
