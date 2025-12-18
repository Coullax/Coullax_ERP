"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Trash, Calculator, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SalaryConfig } from "@/lib/types"

const salaryProcessSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format"),
    additions: z.array(z.object({
        name: z.string().min(1, "Name is required"),
        amount: z.coerce.number().min(0, "Amount must be positive"),
        type: z.enum(["allowance", "bonus"])
    })),
    deductions: z.array(z.object({
        name: z.string().min(1, "Name is required"),
        amount: z.coerce.number().min(0, "Amount must be positive"),
        type: z.enum(["deduction", "tax", "leave", "no_pay"]) // no_pay for No Pay Leave
    })),
    notes: z.string().optional()
})

type SalaryProcessFormValues = z.infer<typeof salaryProcessSchema>

interface ProcessSalaryModalProps {
    isOpen: boolean
    onClose: () => void
    employeeId: string | null
    employeeName: string
    initialMonth?: string
    onSuccess: () => void
}

export function ProcessSalaryModal({
    isOpen,
    onClose,
    employeeId,
    employeeName,
    initialMonth,
    onSuccess,
}: ProcessSalaryModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [baseSalary, setBaseSalary] = useState<number>(0)
    const [isLoadingConfig, setIsLoadingConfig] = useState(false)
    const [disputeReason, setDisputeReason] = useState<string | null>(null)

    const form = useForm<SalaryProcessFormValues>({
        resolver: zodResolver(salaryProcessSchema),
        defaultValues: {
            month: initialMonth || new Date().toISOString().substring(0, 7),
            additions: [],
            deductions: [],
            notes: ""
        },
    })

    // Watch for totals
    const watchedAdditions = form.watch("additions")
    const watchedDeductions = form.watch("deductions")

    const totalAdditions = watchedAdditions?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0
    const totalDeductions = watchedDeductions?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0
    const grossSalary = baseSalary + totalAdditions
    const netSalary = grossSalary - totalDeductions

    // Fetch config when employeeId changes or modal opens
    // Fetch config or existing payment when employeeId/month changes
    // Fetch config when employeeId changes or modal opens
    // Fetch config or existing payment when employeeId/month changes
    const currentMonth = form.watch("month")

    useEffect(() => {
        if (!employeeId || !isOpen) return

        setIsLoadingConfig(true)

        const fetchContext = async () => {
            try {
                // 1. Check for existing payment for this month
                const paymentRes = await fetch(`/api/admin/salaries/process?month=${currentMonth}&employee_id=${employeeId}`)
                const paymentData = await paymentRes.json()
                const existingPayment = paymentData.payments?.[0]

                if (existingPayment) {
                    setBaseSalary(Number(existingPayment.base_amount))
                    form.setValue("additions", existingPayment.additions || [])
                    form.setValue("deductions", existingPayment.deductions || [])
                    form.setValue("notes", existingPayment.notes || "")

                    if (existingPayment.employee_status === 'disputed' && existingPayment.dispute_reason) {
                        setDisputeReason(existingPayment.dispute_reason)
                    } else {
                        setDisputeReason(null)
                    }

                    setIsLoadingConfig(false)
                    return
                }

                // 2. If no payment, load default config
                const configRes = await fetch(`/api/admin/salaries/config?employee_id=${employeeId}`)
                const configData = await configRes.json()

                const employee = configData.employees?.[0]
                const salaryConfig = Array.isArray(employee?.salary) ? employee.salary[0] : employee?.salary

                if (salaryConfig) {
                    const config = salaryConfig as SalaryConfig
                    setBaseSalary(Number(config.base_amount))
                    form.setValue("additions", (config.recurring_allowances || []).map(a => ({ ...a, type: 'allowance' })))
                    form.setValue("deductions", (config.recurring_deductions || []).map(d => ({ ...d, type: 'deduction' })))
                } else {
                    toast.error("Salary configuration not found. Please configure first.")
                    setBaseSalary(0)
                    form.setValue("additions", [])
                    form.setValue("deductions", [])
                    setDisputeReason(null)
                }
            } catch (error) {
                console.error("Error loading salary context:", error)
                toast.error("Failed to load salary details")
            } finally {
                setIsLoadingConfig(false)
            }
        }

        fetchContext()
    }, [employeeId, isOpen, form, currentMonth])


    const { fields: additionFields, append: appendAddition, remove: removeAddition } = useFieldArray({
        control: form.control,
        name: "additions",
    })

    const { fields: deductionFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({
        control: form.control,
        name: "deductions",
    })

    async function onSubmit(data: SalaryProcessFormValues) {
        if (!employeeId) return

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/admin/salaries/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employee_id: employeeId,
                    ...data,
                    status: 'paid' // Or 'draft' ? Let's Assume Process = Paid/Finalize for now, or maybe just calculated.
                    // Let's autoset to 'paid' for simplicity or add a checkbox "Mark as Paid".
                    // The prompt said "Process", implying calculation.
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to process salary")
            }

            toast.success("Salary processed successfully")
            onSuccess()
            onClose()
        } catch (error) {
            toast.error("Something went wrong")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Process Payroll: {employeeName}</DialogTitle>
                    <DialogDescription>
                        Calculate and finalize salary for the month.
                    </DialogDescription>
                </DialogHeader>

                {disputeReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-4 rounded-md mb-4">
                        <h4 className="font-semibold text-red-700 dark:text-red-400 text-sm flex items-center mb-1">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Employee Disputed
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-300">
                            "{disputeReason}"
                        </p>
                    </div>
                )}

                {isLoadingConfig ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payroll Month</Label>
                                <Input type="month" {...form.register("month")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Base Salary (LKR)</Label>
                                <div className="p-2 border rounded-md bg-muted font-mono">
                                    {baseSalary.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Additions */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-green-600 font-bold">Additions / Earnings</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() => appendAddition({ name: "", amount: 0, type: "bonus" })}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Add
                                    </Button>
                                </div>

                                {additionFields.length === 0 && <p className="text-xs text-muted-foreground italic">No additions</p>}

                                {additionFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 p-2 border rounded bg-slate-50 dark:bg-slate-900/50">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Name (e.g. Sales Bonus)"
                                                className="h-8 text-xs"
                                                {...form.register(`additions.${index}.name`)}
                                            />
                                            <Select
                                                onValueChange={(val: any) => form.setValue(`additions.${index}.type`, val)}
                                                defaultValue={field.type}
                                            >
                                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="allowance">Allowance</SelectItem>
                                                    <SelectItem value="bonus">Bonus</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                placeholder="Amount"
                                                className="h-8 text-xs"
                                                {...form.register(`additions.${index}.amount`)}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500"
                                                onClick={() => removeAddition(index)}
                                            >
                                                <Trash className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="text-right text-sm font-semibold text-green-600">
                                    Total Additions: +{totalAdditions.toLocaleString()}
                                </div>
                            </div>

                            {/* Deductions */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-red-600 font-bold">Deductions</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() => appendDeduction({ name: "", amount: 0, type: "no_pay" })}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Add
                                    </Button>
                                </div>

                                {deductionFields.length === 0 && <p className="text-xs text-muted-foreground italic">No deductions</p>}

                                {deductionFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 p-2 border rounded bg-slate-50 dark:bg-slate-900/50">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Name (e.g. Unpaid Leave)"
                                                className="h-8 text-xs"
                                                {...form.register(`deductions.${index}.name`)}
                                            />
                                            <Select
                                                onValueChange={(val: any) => form.setValue(`deductions.${index}.type`, val)}
                                                defaultValue={field.type}
                                            >
                                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="deduction">Std Ded.</SelectItem>
                                                    <SelectItem value="tax">Tax</SelectItem>
                                                    <SelectItem value="leave">Leave</SelectItem>
                                                    <SelectItem value="no_pay">No Pay</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                placeholder="Amount"
                                                className="h-8 text-xs"
                                                {...form.register(`deductions.${index}.amount`)}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500"
                                                onClick={() => removeDeduction(index)}
                                            >
                                                <Trash className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="text-right text-sm font-semibold text-red-600">
                                    Total Deductions: -{totalDeductions.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Base Salary:</span>
                                <span>{baseSalary.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Total Additions:</span>
                                <span>+{totalAdditions.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-600">
                                <span>Total Deductions:</span>
                                <span>-{totalDeductions.toLocaleString()}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Net Salary:</span>
                                <span>{netSalary.toLocaleString()} LKR</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting || baseSalary === 0}>
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Process & Save
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
