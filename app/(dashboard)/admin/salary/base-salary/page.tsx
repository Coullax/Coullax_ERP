"use client"

import { SalaryConfigTable } from "@/components/admin/salary/salary-config-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BaseSalaryPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Base Salary Configuration</h1>
                <p className="text-muted-foreground">
                    Set and manage base salaries for all employees.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Employee Salary Configuration</CardTitle>
                    <CardDescription>
                        Set base salaries for employees.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SalaryConfigTable />
                </CardContent>
            </Card>
        </div>
    )
}
