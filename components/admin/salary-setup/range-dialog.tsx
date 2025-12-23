"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
    createSalaryRange,
    updateSalaryRange,
    type SalaryRange,
} from "@/app/actions/salary-setup-actions";

const rangeSchema = z.object({
    name: z.string().min(1, "Range name is required"),
    min_amount: z.coerce.number().min(0, "Minimum amount must be 0 or greater"),
    max_amount: z.coerce.number().nullable().optional(),
});

type RangeFormData = z.infer<typeof rangeSchema>;

interface RangeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    range?: SalaryRange | null;
    onSuccess?: () => void;
}

export function RangeDialog({
    open,
    onOpenChange,
    range,
    onSuccess,
}: RangeDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUnlimited, setIsUnlimited] = useState(!range?.max_amount);
    const isEditing = !!range;

    const form = useForm<RangeFormData>({
        resolver: zodResolver(rangeSchema),
        defaultValues: {
            name: range?.name || "",
            min_amount: range?.min_amount || 0,
            max_amount: range?.max_amount || undefined,
        },
    });

    const onSubmit = async (data: RangeFormData) => {
        setIsSubmitting(true);
        try {
            const submitData = {
                ...data,
                max_amount: isUnlimited ? null : data.max_amount,
            };

            const result = isEditing
                ? await updateSalaryRange(range.id, submitData)
                : await createSalaryRange(submitData);

            if (result.success) {
                toast.success(
                    isEditing
                        ? "Salary range updated successfully"
                        : "Salary range created successfully"
                );
                form.reset();
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(result.error || "Failed to save salary range");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Salary Range" : "Add New Salary Range"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the salary range details."
                            : "Create a new salary range bracket for calculations."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Range Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., Range 1: 0 - 50,000"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        A descriptive name for this salary range
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="min_amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Minimum Amount (LKR)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="unlimited"
                                    checked={isUnlimited}
                                    onChange={(e) => setIsUnlimited(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <label
                                    htmlFor="unlimited"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    No maximum (unlimited)
                                </label>
                            </div>

                            {!isUnlimited && (
                                <FormField
                                    control={form.control}
                                    name="max_amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Maximum Amount (LKR)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isEditing ? "Update" : "Create"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
