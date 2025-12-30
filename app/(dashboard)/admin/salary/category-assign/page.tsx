"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Gift, Search, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    getAllSalaryCategories,
    type SalaryCategory,
} from "@/app/actions/salary-setup-actions";
import { EmployeeAssignmentDialog } from "@/components/admin/salary-setup/employee-assignment-dialog";
import { OvertimeManagementDialog } from "@/components/admin/salary/overtime-management-dialog";

export default function CategoryAssignPage() {
    const [categories, setCategories] = useState<SalaryCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<SalaryCategory | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const result = await getAllSalaryCategories();
            if (result.success) {
                setCategories(result.data || []);
            } else {
                setError(result.error || "Failed to load categories");
            }
        } catch (err) {
            setError("An unexpected error occurred");
            console.error("Error loading categories:", err);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryTypeBadge = (type: string) => {
        switch (type) {
            case "deduction":
                return <Badge variant="destructive" className="gap-1"><TrendingDown className="w-3 h-3" />Deduction</Badge>;
            case "addition":
                return <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700"><TrendingUp className="w-3 h-3" />Addition</Badge>;
            case "allowance":
                return <Badge variant="secondary" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"><Gift className="w-3 h-3" />Allowance</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    // Filter categories based on search query
    const filteredCategories = categories.filter((category) => {
        const query = searchQuery.toLowerCase();
        return (
            category.name.toLowerCase().includes(query) ||
            category.description?.toLowerCase().includes(query) ||
            category.category_type.toLowerCase().includes(query)
        );
    });

    // Group categories by type
    const groupedCategories = {
        deduction: filteredCategories.filter((c) => c.category_type === "deduction"),
        addition: filteredCategories.filter((c) => c.category_type === "addition"),
        allowance: filteredCategories.filter((c) => c.category_type === "allowance"),
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading salary categories...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Employee Category Assignment</h1>
                <p className="text-muted-foreground mt-1">
                    View all salary categories configured in the system
                </p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredCategories.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {categories.length} total in system
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Deductions</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{groupedCategories.deduction.length}</div>
                        <p className="text-xs text-muted-foreground">Categories</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Additions & Allowances</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {groupedCategories.addition.length + groupedCategories.allowance.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Categories</p>
                    </CardContent>
                </Card>
            </div>

            {/* Categories by Type */}
            <div className="space-y-6">
                {/* Deductions */}
                {groupedCategories.deduction.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingDown className="w-5 h-5 text-red-600" />
                                        Deductions
                                    </CardTitle>
                                    <CardDescription>
                                        Salary deduction categories
                                    </CardDescription>
                                </div>
                                <Badge variant="destructive">{groupedCategories.deduction.length}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {groupedCategories.deduction.map((category) => (
                                    <Card
                                        key={category.id}
                                        className="border-l-4 border-l-red-600 cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => {
                                            setSelectedCategory(category);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-base">{category.name}</CardTitle>
                                                {getCategoryTypeBadge(category.category_type)}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                {category.description || "No description provided"}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Additions */}
                {groupedCategories.addition.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        Additions
                                    </CardTitle>
                                    <CardDescription>
                                        Salary addition categories
                                    </CardDescription>
                                </div>
                                <Badge className="bg-green-600 hover:bg-green-700">{groupedCategories.addition.length}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {groupedCategories.addition.map((category) => (
                                    <Card
                                        key={category.id}
                                        className="border-l-4 border-l-green-600 cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => {
                                            // Check if this is the Overtime category
                                            if (category.name.toLowerCase().includes("overtime")) {
                                                setOvertimeDialogOpen(true);
                                            } else {
                                                setSelectedCategory(category);
                                                setDialogOpen(true);
                                            }
                                        }}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-base">{category.name}</CardTitle>
                                                {getCategoryTypeBadge(category.category_type)}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                {category.description || "No description provided"}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Allowances */}
                {groupedCategories.allowance.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Gift className="w-5 h-5 text-blue-600" />
                                        Allowances
                                    </CardTitle>
                                    <CardDescription>
                                        Salary allowance categories
                                    </CardDescription>
                                </div>
                                <Badge className="bg-blue-600 hover:bg-blue-700">{groupedCategories.allowance.length}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {groupedCategories.allowance.map((category) => (
                                    <Card
                                        key={category.id}
                                        className="border-l-4 border-l-blue-600 cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => {
                                            setSelectedCategory(category);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-base">{category.name}</CardTitle>
                                                {getCategoryTypeBadge(category.category_type)}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                {category.description || "No description provided"}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Others */}
                {/* <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-purple-600" />
                                    Others
                                </CardTitle>
                                <CardDescription>
                                    Special salary components and adjustments
                                </CardDescription>
                            </div>
                            <Badge className="bg-purple-600 hover:bg-purple-700">1</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card
                                className="border-l-4 border-l-purple-600 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => setOvertimeDialogOpen(true)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base">Overtime (OT)</CardTitle>
                                        <Badge variant="secondary" className="gap-1 bg-purple-600 hover:bg-purple-700 text-white">
                                            <Clock className="w-3 h-3" />OT
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Manage and approve overtime hours for salary calculation
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card> */}

                {/* No results */}
                {filteredCategories.length === 0 && (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No categories found</h3>
                                <p className="text-muted-foreground">
                                    {searchQuery
                                        ? "No categories match your search criteria"
                                        : "No salary categories have been configured yet"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Employee Assignment Dialog */}
            <EmployeeAssignmentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                category={selectedCategory}
            />

            {/* Overtime Management Dialog */}
            <OvertimeManagementDialog
                open={overtimeDialogOpen}
                onOpenChange={setOvertimeDialogOpen}
                initialMonth={new Date().toISOString().substring(0, 7)}
            />
        </div>
    );
}
