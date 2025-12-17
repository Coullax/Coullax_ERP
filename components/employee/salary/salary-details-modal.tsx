"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Loader2, CheckCircle, XCircle, FileText, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { SalaryPayment } from "@/lib/types"

interface SalaryDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    payment: SalaryPayment | null
    onStatusUpdate: () => void
}

const disputeSchema = z.object({
    reason: z.string().min(5, "Reason is required to dispute"),
})

export function SalaryDetailsModal({
    isOpen,
    onClose,
    payment,
    onStatusUpdate,
}: SalaryDetailsModalProps) {
    const [action, setAction] = useState<'view' | 'approve' | 'dispute'>('view')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<z.infer<typeof disputeSchema>>({
        resolver: zodResolver(disputeSchema),
        defaultValues: { reason: "" }
    })

    if (!payment) return null

    const handleAction = async (act: 'approve' | 'dispute', reason?: string) => {
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/employee/salaries/${payment.id}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: act, reason }),
            })

            if (!res.ok) throw new Error("Failed to update status")

            toast.success(act === 'approve' ? "Salary approved" : "Dispute submitted")
            onStatusUpdate()
            onClose()
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setIsSubmitting(false)
        }
    }

    const netSalary = Number(payment.net_amount)
    const baseAmount = Number(payment.base_amount)
    const totalAdditions = (payment.additions || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0)
    const totalDeductions = (payment.deductions || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0)

    // Check custom employee_status field. If undefined (old records), assume pending if status is paid.
    // Actually we added the column.
    const employeeStatus = payment.employee_status || 'pending'

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Salary Details: {payment.month}</DialogTitle>
                    <DialogDescription>
                        Review your salary breakdown for this month.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={
                                employeeStatus === 'approved' ? "default" :
                                    employeeStatus === 'disputed' ? "destructive" : "secondary"
                            }>
                                {employeeStatus.toUpperCase()}
                            </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Base Salary</span>
                            <span>{baseAmount.toLocaleString()} LKR</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Additions</span>
                            <span>+{totalAdditions.toLocaleString()}</span>
                        </div>
                        {payment.additions && payment.additions.length > 0 && (
                            <div className="pl-4 text-xs text-muted-foreground space-y-1">
                                {payment.additions.map((a: any, i: number) => (
                                    <div key={i} className="flex justify-between">
                                        <span>{a.name}</span>
                                        <span>{Number(a.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-red-600">
                            <span>Deductions</span>
                            <span>-{totalDeductions.toLocaleString()}</span>
                        </div>
                        {payment.deductions && payment.deductions.length > 0 && (
                            <div className="pl-4 text-xs text-muted-foreground space-y-1">
                                {payment.deductions.map((d: any, i: number) => (
                                    <div key={i} className="flex justify-between">
                                        <span>{d.name}</span>
                                        <span>{Number(d.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold">
                            <span>Net Salary</span>
                            <span>{netSalary.toLocaleString()} LKR</span>
                        </div>
                    </div>

                    {action === 'dispute' ? (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((data) => handleAction('dispute', data.reason))} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="reason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reason for Dispute</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} placeholder="Please explain why the amount is incorrect..." />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setAction('view')}>Cancel</Button>
                                    <Button type="submit" variant="destructive" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Submit Dispute
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    ) : (
                        employeeStatus === 'pending' && (
                            <div className="flex gap-2">
                                <Button className="flex-1" variant="outline" onClick={() => setAction('dispute')}>
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Dispute
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleAction('approve')}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Approve
                                </Button>
                            </div>
                        )
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
