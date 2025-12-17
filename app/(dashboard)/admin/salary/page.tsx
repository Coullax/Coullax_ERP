"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SalaryConfigTable } from "@/components/admin/salary/salary-config-table"
import { PayrollProcessor } from "@/components/admin/salary/payroll-processor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SalaryManagementPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Salary Management</h1>
                <p className="text-muted-foreground">
                    Configure employee salaries and process monthly payroll.
                </p>
            </div>

            <Tabs defaultValue="processing" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="processing">Payroll Processing</TabsTrigger>
                    <TabsTrigger value="config">Salary Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="config">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employee Salary Configuration</CardTitle>
                            <CardDescription>
                                Set base salaries and recurring allowances/deductions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SalaryConfigTable />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="processing">
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
                </TabsContent>
            </Tabs>
        </div>
    )
}
