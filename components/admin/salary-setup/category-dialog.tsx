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
    createSalaryCategory,
    updateSalaryCategory,
    type SalaryCategory,
} from "@/app/actions/salary-setup-actions";

const categorySchema = z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional(),
    category_type: z.enum(["deduction", "addition", "allowance"]),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: SalaryCategory | null;
    onSuccess?: () => void;
}

export function CategoryDialog({
    open,
    onOpenChange,
    category,
    onSuccess,
}: CategoryDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!category;

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: category?.name || "",
            description: category?.description || "",
            category_type: category?.category_type || "addition",
        },
    });

    // Reset form when category changes (for editing)
    useEffect(() => {
        if (category) {
            form.reset({
                name: category.name,
                description: category.description || "",
                category_type: category.category_type,
            });
        } else {
            form.reset({
                name: "",
                description: "",
                category_type: "addition",
            });
        }
    }, [category, form]);

    const onSubmit = async (data: CategoryFormData) => {
        setIsSubmitting(true);
        try {
            const result = isEditing
                ? await updateSalaryCategory(category.id, data)
                : await createSalaryCategory(data);

            if (result.success) {
                toast.success(
                    isEditing
                        ? "Category updated successfully"
                        : "Category created successfully"
                );
                form.reset();
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(result.error || "Failed to save category");
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
                        {isEditing ? "Edit Category" : "Add New Category"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the salary category details."
                            : "Create a new salary category for calculations."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., APIT, EPF, ETF" {...field} />
                                    </FormControl>
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
                                            placeholder="Brief description of this category"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="category_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="addition">Addition</SelectItem>
                                            <SelectItem value="deduction">Deduction</SelectItem>
                                            {/* <SelectItem value="allowance">Allowance</SelectItem> */}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Determines how this category affects salary
                                    </FormDescription>
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
