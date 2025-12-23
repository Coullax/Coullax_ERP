"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
    createCategoryRule,
    updateCategoryRule,
    type SalaryCategoryRule,
    type SalaryCategory,
    type SalaryRange,
} from "@/app/actions/salary-setup-actions";

const ruleSchema = z.object({
    category_id: z.string().min(1, "Category is required"),
    salary_range_id: z.string().nullable().optional(),
    calculation_type: z.enum(["percentage", "fixed"]),
    value: z.coerce.number().min(0, "Value must be 0 or greater"),
    applies_to_category_id: z.string().nullable().optional(),
    description: z.string().optional(),
});

type RuleFormData = z.infer<typeof ruleSchema>;

interface RuleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rule?: SalaryCategoryRule | null;
    categories: SalaryCategory[];
    ranges: SalaryRange[];
    onSuccess?: () => void;
}

export function RuleDialog({
    open,
    onOpenChange,
    rule,
    categories,
    ranges,
    onSuccess,
}: RuleDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [applyToAll, setApplyToAll] = useState(!rule?.salary_range_id);
    const isEditing = !!rule;

    const form = useForm<RuleFormData>({
        resolver: zodResolver(ruleSchema),
        defaultValues: {
            category_id: rule?.category_id || "",
            salary_range_id: rule?.salary_range_id || null,
            calculation_type: rule?.calculation_type || "percentage",
            value: rule?.value || 0,
            applies_to_category_id: rule?.applies_to_category_id || null,
            description: rule?.description || "",
        },
    });

    const calculationType = form.watch("calculation_type");

    const onSubmit = async (data: RuleFormData) => {
        setIsSubmitting(true);
        try {
            const submitData = {
                ...data,
                salary_range_id: applyToAll ? null : data.salary_range_id,
            };

            const result = isEditing
                ? await updateCategoryRule(rule.id, submitData)
                : await createCategoryRule(submitData);

            if (result.success) {
                toast.success(
                    isEditing ? "Rule updated successfully" : "Rule created successfully"
                );
                form.reset();
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(result.error || "Failed to save rule");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Calculation Rule" : "Add New Calculation Rule"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the calculation rule details."
                            : "Create a new calculation rule for a salary category."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="category_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name} ({cat.category_type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        The category this rule applies to
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="applyToAll"
                                    checked={applyToAll}
                                    onChange={(e) => setApplyToAll(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <label
                                    htmlFor="applyToAll"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Apply to all salary ranges
                                </label>
                            </div>

                            {!applyToAll && (
                                <FormField
                                    control={form.control}
                                    name="salary_range_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Salary Range</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value || undefined}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select salary range" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ranges.map((range) => (
                                                        <SelectItem key={range.id} value={range.id}>
                                                            {range.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="calculation_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Calculation Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select calculation type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {calculationType === "percentage"
                                            ? "Percentage (%)"
                                            : "Fixed Amount (LKR)"}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder={
                                                calculationType === "percentage" ? "8.5" : "5000.00"
                                            }
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {calculationType === "percentage"
                                            ? "Enter percentage value (e.g., 8.5 for 8.5%)"
                                            : "Enter fixed amount in LKR"}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="applies_to_category_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Applies To (Optional)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value || undefined}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category (or leave empty for base salary)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="null">Base Salary</SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Which category to calculate from (e.g., calculate EPF from Basic Salary)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Brief description of this rule"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
