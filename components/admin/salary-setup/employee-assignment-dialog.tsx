"use client";

import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
    getEmployeesWithBaseSalary,
    getAssignedEmployeesByCategory,
    assignEmployeesToCategory,
    type EmployeeWithBaseSalary,
} from "@/app/actions/employee-category-assign-actions";
import { getRulesByCategory, type SalaryCategory, type SalaryCategoryRule } from "@/app/actions/salary-setup-actions";

interface EmployeeAssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: SalaryCategory | null;
}

export function EmployeeAssignmentDialog({
    open,
    onOpenChange,
    category,
}: EmployeeAssignmentDialogProps) {
    const [employees, setEmployees] = useState<EmployeeWithBaseSalary[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [calculatedValues, setCalculatedValues] = useState<Record<string, number>>({});
    const [categoryRule, setCategoryRule] = useState<SalaryCategoryRule | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (open && category) {
            loadData();
        }
    }, [open, category]);

    const loadData = async () => {
        if (!category) return;

        try {
            setLoading(true);
            const [employeesResult, assignedResult, rulesResult] = await Promise.all([
                getEmployeesWithBaseSalary(),
                getAssignedEmployeesByCategory(category.id),
                getRulesByCategory(category.id),
            ]);

            if (employeesResult.success) {
                setEmployees(employeesResult.data);
            }

            if (assignedResult.success) {
                setSelectedEmployeeIds(assignedResult.data);
            }

            // Get the first rule for this category
            if (rulesResult.success && rulesResult.data.length > 0) {
                setCategoryRule(rulesResult.data[0]);
            } else {
                setCategoryRule(null);
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load employee data");
        } finally {
            setLoading(false);
        }
    };

    const calculateValue = (baseSalary: number | null): number | null => {
        if (!baseSalary || !categoryRule) return null;

        if (categoryRule.calculation_type === "percentage") {
            return (baseSalary * categoryRule.value) / 100;
        } else {
            return categoryRule.value;
        }
    };

    const handleSave = async () => {
        if (!category) return;

        try {
            setSaving(true);
            const result = await assignEmployeesToCategory(
                category.id,
                selectedEmployeeIds,
                category.category_type,
                calculatedValues
            );

            if (result.success) {
                toast.success("Employee assignments updated successfully");
                onOpenChange(false);
            } else {
                toast.error(result.error || "Failed to update assignments");
            }
        } catch (error) {
            console.error("Error saving assignments:", error);
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
        } else {
            setSelectedEmployeeIds([]);
        }
    };

    const handleEmployeeToggle = (employeeId: string, checked: boolean) => {
        if (checked) {
            setSelectedEmployeeIds([...selectedEmployeeIds, employeeId]);
            // Calculate the value for this employee
            const employee = employees.find(e => e.id === employeeId);
            if (employee && employee.base_salary) {
                const calculated = calculateValue(employee.base_salary);
                if (calculated !== null) {
                    setCalculatedValues(prev => ({
                        ...prev,
                        [employeeId]: calculated
                    }));
                }
            }
        } else {
            setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== employeeId));
            // Remove calculated value
            setCalculatedValues(prev => {
                const newValues = { ...prev };
                delete newValues[employeeId];
                return newValues;
            });
        }
    };

    const filteredEmployees = employees.filter((employee) => {
        const query = searchQuery.toLowerCase();
        return (
            employee.full_name.toLowerCase().includes(query) ||
            employee.email.toLowerCase().includes(query)
        );
    });

    const allSelected = filteredEmployees.length > 0 &&
        filteredEmployees.every((e) => selectedEmployeeIds.includes(e.id));
    const someSelected = filteredEmployees.some((e) => selectedEmployeeIds.includes(e.id)) && !allSelected;

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return "Not set";
        return new Intl.NumberFormat("en-LK", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Assign Employees to Category</DialogTitle>
                    <DialogDescription>
                        Select employees to assign to the &quot;{category?.name}&quot; category
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search employees..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Select All */}
                        <div className="flex items-center space-x-2 border-b pb-3">
                            <Checkbox
                                id="select-all"
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                ref={(el) => {
                                    if (el) {
                                        // @ts-ignore
                                        el.indeterminate = someSelected;
                                    }
                                }}
                            />
                            <label
                                htmlFor="select-all"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Select All ({selectedEmployeeIds.length} of {filteredEmployees.length} selected)
                            </label>
                        </div>

                        {/* Employee List */}
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-3">
                                {filteredEmployees.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        No employees found
                                    </p>
                                ) : (
                                    filteredEmployees.map((employee) => (
                                        <div
                                            key={employee.id}
                                            className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <Checkbox
                                                id={`employee-${employee.id}`}
                                                checked={selectedEmployeeIds.includes(employee.id)}
                                                onCheckedChange={(checked) =>
                                                    handleEmployeeToggle(employee.id, checked as boolean)
                                                }
                                            />
                                            <label
                                                htmlFor={`employee-${employee.id}`}
                                                className="flex-1 cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{employee.full_name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {employee.email}
                                                        </p>
                                                    </div>
                                                    <div className="text-right space-y-2">
                                                        {/* Base Salary */}
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Base Salary</p>
                                                            <p className="text-sm font-semibold">
                                                                {formatCurrency(employee.base_salary)}
                                                            </p>
                                                        </div>

                                                        {/* Current Total (before this category) */}
                                                        {employee.current_total !== undefined && employee.current_total !== employee.base_salary && (
                                                            <div className="pt-2 border-t">
                                                                <p className="text-xs text-muted-foreground">Current Total</p>
                                                                <p className="text-sm font-semibold text-blue-600">
                                                                    {formatCurrency(employee.current_total)}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Category Amount & Final Total (when selected) */}
                                                        {selectedEmployeeIds.includes(employee.id) && calculatedValues[employee.id] && (
                                                            <>
                                                                <div className="pt-2 border-t">
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {category?.category_type === "deduction" ? "Deducting" : "Adding"}
                                                                        {categoryRule?.calculation_type === "percentage"
                                                                            ? ` (${categoryRule.value}%)`
                                                                            : " (Fixed)"}
                                                                    </p>
                                                                    <p className={`text-sm font-semibold ${category?.category_type === "deduction"
                                                                            ? "text-red-600"
                                                                            : "text-green-600"
                                                                        }`}>
                                                                        {category?.category_type === "deduction" && "-"}
                                                                        {formatCurrency(calculatedValues[employee.id])}
                                                                    </p>
                                                                </div>
                                                                <div className="pt-2 border-t border-primary/30 bg-primary/5 px-2 py-1 rounded">
                                                                    <p className="text-xs text-muted-foreground font-semibold">Final Total</p>
                                                                    <p className="text-base font-bold text-primary">
                                                                        {formatCurrency(
                                                                            (employee.current_total || employee.base_salary || 0) +
                                                                            (category?.category_type === "deduction"
                                                                                ? -calculatedValues[employee.id]
                                                                                : calculatedValues[employee.id])
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Assignments
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
