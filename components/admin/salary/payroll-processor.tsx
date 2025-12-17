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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Play, Eye } from "lucide-react"
import { ProcessSalaryModal } from "./process-salary-modal"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import { SalaryPayment } from "@/lib/types"

export function PayrollProcessor() {
    const [employees, setEmployees] = useState<any[]>([])
    const [payments, setPayments] = useState<SalaryPayment[]>([])
    const [loading, setLoading] = useState(true)
    const [month, setMonth] = useState<string>(new Date().toISOString().substring(0, 7)) // YYYY-MM
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch all employees (using config endpoint which returns all)
            const empRes = await fetch("/api/admin/salaries/config")
            const empData = await empRes.json()

            // Fetch payments for the month
            const payRes = await fetch(`/api/admin/salaries/process?month=${month}`)
            const payData = await payRes.json()

            if (empData.employees) setEmployees(empData.employees)
            if (payData.payments) setPayments(payData.payments)

        } catch (error) {
            console.error("Failed to fetch payroll data", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [month])

    const handleProcess = (employee: any) => {
        setSelectedEmployee(employee)
        setIsModalOpen(true)
    }

    // Helper to find payment
    const getPayment = (empId: string) => payments.find(p => p.employee_id === empId)

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-48"
                />
                <Button onClick={fetchData} variant="outline" size="sm">
                    Refresh List
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Base Salary</TableHead>
                            <TableHead>Net Salary</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No employees found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            employees.map((emp) => {
                                const payment = getPayment(emp.id)
                                const isPaid = !!payment

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
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{emp.designation?.title || "-"}</span>
                                        </TableCell>
                                        <TableCell>
                                            {isPaid ? (
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 w-fit">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                                                    </Badge>
                                                    {payment.employee_status === 'approved' && (
                                                        <Badge variant="outline" className="border-green-600 text-green-600 w-fit text-[10px] px-1 py-0 h-5">
                                                            Emp: Approved
                                                        </Badge>
                                                    )}
                                                    {payment.employee_status === 'disputed' && (
                                                        <Badge variant="destructive" className="w-fit text-[10px] px-1 py-0 h-5">
                                                            Emp: Disputed
                                                        </Badge>
                                                    )}
                                                    {(!payment.employee_status || payment.employee_status === 'pending') && (
                                                        <Badge variant="secondary" className="text-muted-foreground w-fit text-[10px] px-1 py-0 h-5">
                                                            Emp: Pending
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-zinc-500">
                                                    <Circle className="w-3 h-3 mr-1" /> Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">
                                                {payment
                                                    ? Number(payment.base_amount).toLocaleString()
                                                    : (emp.salary?.base_amount ? Number(emp.salary.base_amount).toLocaleString() : "-")
                                                }
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {payment ? (
                                                <span className="font-bold font-mono text-sm">
                                                    {Number(payment.net_amount).toLocaleString()} LKR
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isPaid ? (
                                                <Button variant="ghost" size="sm" onClick={() => handleProcess(emp)}>
                                                    <Eye className="w-4 h-4 mr-2" /> View/Edit
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    disabled={!emp.salary?.base_amount}
                                                    onClick={() => handleProcess(emp)}
                                                >
                                                    <Play className="w-4 h-4 mr-2" /> Process This Month
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedEmployee && (
                <ProcessSalaryModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    employeeId={selectedEmployee.id}
                    employeeName={selectedEmployee.profiles?.full_name}
                    initialMonth={month}
                    onSuccess={fetchData}
                />
            )}
        </div>
    )
}
