"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Eye, FileText, CheckCircle, XCircle, Clock } from "lucide-react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SalaryPayment } from "@/lib/types"
import { SalaryDetailsModal } from "@/components/employee/salary/salary-details-modal"
import Link from "next/link"

export default function EmployeeSalaryPage() {
    const [payments, setPayments] = useState<SalaryPayment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null)

    const fetchSalaries = async () => {
        try {
            const res = await fetch("/api/employee/salaries")
            const data = await res.json()
            if (data.payments) {
                setPayments(data.payments)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchSalaries()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">My Salary</h1>
                <p className="text-muted-foreground">
                    View your salary history and payment statuses.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>
                        Overview of your monthly salary payments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-4">Loading...</div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No salary records found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Base Salary</TableHead>
                                    <TableHead>Net Salary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">{payment.month}</TableCell>
                                        <TableCell>{Number(payment.base_amount).toLocaleString()} LKR</TableCell>
                                        <TableCell className="font-bold">{Number(payment.net_amount).toLocaleString()} LKR</TableCell>
                                        <TableCell>
                                            {/* Show Employee Status, fallback to 'Pending' if null */}
                                            {payment.employee_status === 'approved' ? (
                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Approved
                                                </Badge>
                                            ) : payment.employee_status === 'disputed' ? (
                                                <Badge variant="destructive">
                                                    <XCircle className="w-3 h-3 mr-1" /> Disputed
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    <Clock className="w-3 h-3 mr-1" /> Pending Review
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedPayment(payment)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button> */}
                                            <Link target="_blank" href={`/employee/salary/slip/${payment.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <SalaryDetailsModal
                isOpen={!!selectedPayment}
                onClose={() => setSelectedPayment(null)}
                payment={selectedPayment}
                onStatusUpdate={fetchSalaries}
            />
        </div>
    )
}
