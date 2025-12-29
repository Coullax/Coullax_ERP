"use client"

import { useState, useEffect } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, DollarSign, Search } from "lucide-react"
import { SalaryConfigModal } from "./salary-config-modal"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import { SalaryConfig } from "@/lib/types"

interface EmployeeConfig {
    id: string
    employee_id: string
    profiles: {
        full_name: string
        avatar_url: string | null
        email: string
    }
    department: {
        name: string
    } | null
    designation: {
        title: string
    } | null
    salary: SalaryConfig | null // Can be null if array is empty or join returns nothing? 
    // Wait, if it's one-to-one, supabase returns single object if not array.
    // My query was `salary:salaries(*)` which returns an array in supabase-js usually, unless `single()` is used on the join? 
    // No, `salaries(*)` usually returns array because it's a "has many" relation direction from supabase perspective even if unique constraint exists.
    // Wait, I should check the response format.
    // Assuming it returns an array `salary: [...]`.
}

// Helper to safely access salary config
const getSalary = (emp: any): SalaryConfig | null => {
    if (Array.isArray(emp.salary) && emp.salary.length > 0) return emp.salary[0]
    if (emp.salary && !Array.isArray(emp.salary)) return emp.salary // single object
    return null
}

export function SalaryConfigTable() {
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const fetchEmployees = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/salaries/config")
            const data = await res.json()
            if (data.employees) {
                setEmployees(data.employees)
            }
        } catch (error) {
            console.error("Failed to fetch employees", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEmployees()
    }, [])

    const filteredEmployees = employees.filter(emp =>
        emp.profiles?.full_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(search.toLowerCase())
    )

    const handleEdit = (employee: any) => {
        setSelectedEmployee(employee)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employees..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={fetchEmployees} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Base Salary</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredEmployees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No employees found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEmployees.map((emp) => {
                                const salary = getSalary(emp)
                                const allowanceCount = salary?.recurring_allowances?.length || 0
                                const deductionCount = salary?.recurring_deductions?.length || 0

                                return (
                                    <TableRow key={emp.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={emp.profiles?.avatar_url || ""} />
                                                    <AvatarFallback>{emp.profiles?.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{emp.profiles?.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{emp.employee_id}</p>
                                                    <p className="text-xs text-muted-foreground">{emp.profiles?.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm">{emp.department?.name || "-"}</span>
                                                <span className="text-xs text-muted-foreground">{emp.designation?.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {salary ? (
                                                <span className="font-mono font-medium">
                                                    {Number(salary.base_amount).toLocaleString()} LKR
                                                </span>
                                            ) : (
                                                <Badge variant="secondary">Not Set</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(emp)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit Configuration
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedEmployee && (
                <SalaryConfigModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    employeeId={selectedEmployee.id}
                    employeeName={selectedEmployee.profiles?.full_name}
                    currentConfig={getSalary(selectedEmployee)}
                    onSuccess={fetchEmployees}
                />
            )}
        </div>
    )
}
