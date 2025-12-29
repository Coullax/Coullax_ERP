"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Trash } from "lucide-react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
// Removed unused Form imports

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SalaryConfig } from "@/lib/types"

// Since I don't have the full form wrapper component file handy, I'll stick to controlled inputs with RHF if Form wrapper is missing, 
// but likely it exists given "react-hook-form" dependency.
// I will assume standard shadcn Form components.

const salaryConfigSchema = z.object({
    base_amount: z.coerce.number().min(0, "Base salary must be positive"),
})

type SalaryConfigFormValues = z.infer<typeof salaryConfigSchema>

interface SalaryConfigModalProps {
    isOpen: boolean
    onClose: () => void
    employeeId: string | null
    employeeName: string
    currentConfig?: SalaryConfig | null
    onSuccess: () => void
}

export function SalaryConfigModal({
    isOpen,
    onClose,
    employeeId,
    employeeName,
    currentConfig,
    onSuccess,
}: SalaryConfigModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<SalaryConfigFormValues>({
        resolver: zodResolver(salaryConfigSchema),
        defaultValues: {
            base_amount: currentConfig?.base_amount || 0,
        },
    })



    async function onSubmit(data: SalaryConfigFormValues) {
        if (!employeeId) return

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/admin/salaries/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employee_id: employeeId,
                    ...data,
                    currency: "LKR", // Default for now
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to save salary configuration")
            }

            toast.success("Salary configuration saved")
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Salary: {employeeName}</DialogTitle>
                    <DialogDescription>
                        Configure base salary and recurring components.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Base Salary (LKR)</Label>
                        <Input
                            type="number"
                            {...form.register("base_amount")}
                        />
                        {form.formState.errors.base_amount && (
                            <p className="text-sm text-red-500">{form.formState.errors.base_amount.message}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Configuration
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
