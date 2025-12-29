"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CategoryDialog } from "@/components/admin/salary-setup/category-dialog";
import { RangeDialog } from "@/components/admin/salary-setup/range-dialog";
import { RuleDialog } from "@/components/admin/salary-setup/rule-dialog";
import {
    getSalarySetupData,
    deleteSalaryCategory,
    deleteApitRange,
    deleteCategoryRule,
    type SalaryCategory,
    type ApitRange,
    type SalaryCategoryRule,
} from "@/app/actions/salary-setup-actions";

export default function SalarySetupPage() {
    const [categories, setCategories] = useState<SalaryCategory[]>([]);
    const [ranges, setRanges] = useState<ApitRange[]>([]);
    const [rules, setRules] = useState<SalaryCategoryRule[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

    // Edit states
    const [editingCategory, setEditingCategory] = useState<SalaryCategory | null>(null);
    const [editingRange, setEditingRange] = useState<ApitRange | null>(null);
    const [editingRule, setEditingRule] = useState<SalaryCategoryRule | null>(null);

    // Delete dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteType, setDeleteType] = useState<"category" | "range" | "rule">("category");
    const [deleteId, setDeleteId] = useState<string>("");

    const loadData = async () => {
        setLoading(true);
        const result = await getSalarySetupData();
        if (result.success) {
            setCategories(result.data.categories);
            setRanges(result.data.ranges);
            setRules(result.data.rules);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async () => {
        let result;
        if (deleteType === "category") {
            result = await deleteSalaryCategory(deleteId);
        } else if (deleteType === "range") {
            result = await deleteApitRange(deleteId);
        } else {
            result = await deleteCategoryRule(deleteId);
        }

        if (result.success) {
            toast.success(`${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deleted successfully`);
            loadData();
        } else {
            toast.error(result.error || "Failed to delete");
        }
        setDeleteDialogOpen(false);
    };

    const openDeleteDialog = (type: "category" | "range" | "rule", id: string) => {
        setDeleteType(type);
        setDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const getCategoryTypeBadge = (type: string) => {
        const variants = {
            deduction: "destructive",
            addition: "default",
            allowance: "secondary",
        } as const;
        return (
            <Badge variant={variants[type as keyof typeof variants] || "default"}>
                {type}
            </Badge>
        );
    };

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return "Unlimited";
        return new Intl.NumberFormat("en-LK", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading salary setup...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Salary Setup</h1>
                <p className="text-gray-600">
                    Configure salary categories, ranges, and calculation rules
                </p>
            </div>

            <Tabs defaultValue="categories" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="categories" className="gap-2">
                        <DollarSign className="w-4 h-4" />
                        Categories
                    </TabsTrigger>
                    <TabsTrigger value="ranges" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        APIT Ranges
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="gap-2">
                        <Calculator className="w-4 h-4" />
                        Calculation Rules
                    </TabsTrigger>
                </TabsList>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Salary Categories</CardTitle>
                                    <CardDescription>
                                        Define categories like APIT, EPF, ETF, allowances, and deductions
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={() => {
                                        setEditingCategory(null);
                                        setCategoryDialogOpen(true);
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Category
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {categories.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No categories created yet</p>
                                    <p className="text-sm">Click "Add Category" to get started</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Calculation</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categories.map((category) => (
                                            <TableRow key={category.id}>
                                                <TableCell className="font-medium">{category.name}</TableCell>
                                                <TableCell className="text-gray-600">
                                                    {category.description || "-"}
                                                </TableCell>
                                                <TableCell>{getCategoryTypeBadge(category.category_type)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {category.is_percentage_based ? "Percentage" : "Fixed Amount"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingCategory(category);
                                                                setCategoryDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog("category", category.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Salary Ranges Tab */}
                <TabsContent value="ranges" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>APIT Salary Ranges</CardTitle>
                                    <CardDescription>
                                        Create APIT salary brackets for different calculation rules
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={() => {
                                        setEditingRange(null);
                                        setRangeDialogOpen(true);
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Range
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {ranges.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No salary ranges created yet</p>
                                    <p className="text-sm">Click "Add Range" to get started</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Minimum Amount</TableHead>
                                            <TableHead>Maximum Amount</TableHead>
                                            <TableHead>APIT Percentage</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ranges.map((range) => (
                                            <TableRow key={range.id}>
                                                <TableCell className="font-medium">{range.name}</TableCell>
                                                <TableCell>{formatCurrency(range.min_amount)}</TableCell>
                                                <TableCell>{formatCurrency(range.max_amount)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="default">
                                                        {range.percentage}%
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingRange(range);
                                                                setRangeDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog("range", range.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Calculation Rules Tab */}
                <TabsContent value="rules" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Calculation Rules</CardTitle>
                                    <CardDescription>
                                        Configure percentage or fixed amount rules for each category
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={() => {
                                        setEditingRule(null);
                                        setRuleDialogOpen(true);
                                    }}
                                    disabled={categories.length === 0}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Rule
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {rules.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No calculation rules created yet</p>
                                    <p className="text-sm">
                                        {categories.length === 0
                                            ? "Create some categories first"
                                            : "Click \"Add Rule\" to get started"}
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Salary Range</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead>Applies To</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rules.map((rule) => (
                                            <TableRow key={rule.id}>
                                                <TableCell className="font-medium">
                                                    {rule.category?.name || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {rule.apit_range?.name || (
                                                        <Badge variant="outline">All Ranges</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={rule.calculation_type === "percentage" ? "default" : "secondary"}>
                                                        {rule.calculation_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {rule.calculation_type === "percentage"
                                                        ? `${rule.value}%`
                                                        : formatCurrency(rule.value)}
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {rule.applies_to_category?.name || "Base Salary"}
                                                </TableCell>
                                                <TableCell className="text-gray-600 max-w-xs truncate">
                                                    {rule.description || "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingRule(rule);
                                                                setRuleDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog("rule", rule.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <CategoryDialog
                open={categoryDialogOpen}
                onOpenChange={setCategoryDialogOpen}
                category={editingCategory}
                onSuccess={loadData}
            />

            <RangeDialog
                open={rangeDialogOpen}
                onOpenChange={setRangeDialogOpen}
                range={editingRange}
                onSuccess={loadData}
            />

            <RuleDialog
                open={ruleDialogOpen}
                onOpenChange={setRuleDialogOpen}
                rule={editingRule}
                categories={categories}
                ranges={ranges}
                onSuccess={loadData}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this{" "}
                            {deleteType}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
