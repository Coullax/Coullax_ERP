"use client"

import { PayrollProcessor } from "@/components/admin/salary/payroll-processor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SalaryProcessingPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Salary Processing</h1>
                <p className="text-muted-foreground">
                    Process and finalize monthly payroll for employees.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Monthly Payroll</CardTitle>
                    <CardDescription>
                        Process and finalize salaries for the month.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PayrollProcessor />
                </CardContent>
            </Card>
        </div>
    )
}
