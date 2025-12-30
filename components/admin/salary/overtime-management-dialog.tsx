"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, Clock, DollarSign, Calendar, CheckCircle2, Info } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
    getEmployeesWithOvertimeRequests,
    approveOvertimeForSalary,
    type OvertimeRequest,
} from "@/app/actions/overtime-salary-actions";
import { format } from "date-fns";

interface OvertimeManagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMonth?: string;
}

export function OvertimeManagementDialog({
    open,
    onOpenChange,
    initialMonth,
}: OvertimeManagementDialogProps) {
    const [overtimeRequests, setOvertimeRequests] = useState<any[]>([]);
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [month, setMonth] = useState<string>(
        initialMonth || new Date().toISOString().substring(0, 7)
    );

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, month]);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await getEmployeesWithOvertimeRequests(month);

            if (result.success) {
                setOvertimeRequests(result.data);
                // Auto-select requests that aren't already approved
                const unapprovedIds = result.data
                    .filter((req: any) => !req.approval || req.approval.length === 0)
                    .map((req: any) => req.id);
                setSelectedRequestIds(unapprovedIds);
            } else {
                toast.error(result.error || "Failed to load overtime requests");
            }
        } catch (error) {
            console.error("Error loading overtime data:", error);
            toast.error("An error occurred while loading data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (selectedRequestIds.length === 0) {
            toast.error("Please select at least one overtime request");
            return;
        }

        try {
            setSaving(true);

            // Get current user ID for approved_by
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast.error("User not authenticated");
                return;
            }

            const result = await approveOvertimeForSalary(
                selectedRequestIds,
                month,
                user.id
            );

            if (result.success) {
                if (result.message) {
                    toast.warning(result.message);
                } else {
                    toast.success("Overtime approved for salary calculation");
                }
                loadData(); // Reload to show updated statuses
            } else {
                toast.error(result.error || "Failed to approve overtime");
            }
        } catch (error) {
            console.error("Error saving overtime approvals:", error);
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Select all unapproved requests
            const unapprovedIds = filteredRequests
                .filter((req: any) => !req.approval || req.approval.length === 0)
                .map((req: any) => req.id);
            setSelectedRequestIds(unapprovedIds);
        } else {
            setSelectedRequestIds([]);
        }
    };

    const handleRequestToggle = (requestId: string, checked: boolean) => {
        if (checked) {
            setSelectedRequestIds([...selectedRequestIds, requestId]);
        } else {
            setSelectedRequestIds(selectedRequestIds.filter((id) => id !== requestId));
        }
    };

    const filteredRequests = overtimeRequests.filter((request) => {
        const query = searchQuery.toLowerCase();
        return (
            request.employee?.profile?.full_name.toLowerCase().includes(query) ||
            request.employee?.employee_id.toLowerCase().includes(query)
        );
    });

    const calculateAmount = (baseSalary: number, hours: number) => {
        return Math.round(((baseSalary / 240) * hours * 1.5) * 100) / 100;
    };

    const totalSelectedAmount = filteredRequests
        .filter((req: any) => selectedRequestIds.includes(req.id))
        .reduce((sum: number, req: any) => {
            const baseSalary = req.employee?.salary?.base_amount || 0;
            return sum + calculateAmount(Number(baseSalary), req.hours);
        }, 0);

    const totalSelectedHours = filteredRequests
        .filter((req: any) => selectedRequestIds.includes(req.id))
        .reduce((sum: number, req: any) => sum + Number(req.hours), 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-LK", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const allUnapprovedSelected = filteredRequests
        .filter((req: any) => !req.approval || req.approval.length === 0)
        .every((req: any) => selectedRequestIds.includes(req.id));

    const someSelected = selectedRequestIds.length > 0 && !allUnapprovedSelected;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Overtime (OT) Salary Management
                    </DialogTitle>
                    <DialogDescription>
                        Approve overtime hours for salary calculation. Formula: (Base Salary / 240) × Hours × 1.5
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto space-y-4 pr-2">
                        {/* Filters and Stats */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                {/* Month Selector */}
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="month"
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        className="w-48"
                                    />
                                </div>

                                {/* Search */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search employees..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            {/* Summary Stats */}
                            {selectedRequestIds.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Selected Requests</p>
                                        <p className="text-2xl font-bold">{selectedRequestIds.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Hours</p>
                                        <p className="text-2xl font-bold">{totalSelectedHours.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Amount</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatCurrency(totalSelectedAmount)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={allUnapprovedSelected}
                                                onCheckedChange={handleSelectAll}
                                                ref={(el) => {
                                                    if (el) {
                                                        // @ts-ignore
                                                        el.indeterminate = someSelected;
                                                    }
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Hours</TableHead>
                                        <TableHead>Base Salary</TableHead>
                                        <TableHead>OT Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No overtime requests found for this month
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRequests.map((request) => {
                                            const isApproved = request.approval && request.approval.length > 0;
                                            const baseSalary = request.employee?.salary?.base_amount || 0;
                                            const calculatedAmount = calculateAmount(Number(baseSalary), request.hours);

                                            return (
                                                <TableRow key={request.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedRequestIds.includes(request.id)}
                                                            onCheckedChange={(checked) =>
                                                                handleRequestToggle(request.id, checked as boolean)
                                                            }
                                                            disabled={isApproved}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarImage
                                                                    src={request.employee?.profile?.avatar_url || ""}
                                                                />
                                                                <AvatarFallback>
                                                                    {request.employee?.profile?.full_name
                                                                        .substring(0, 2)
                                                                        .toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium text-sm">
                                                                    {request.employee?.profile?.full_name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {request.employee?.employee_id}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">
                                                            {format(new Date(request.date), "MMM dd, yyyy")}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-muted-foreground" />
                                                            <span className="font-mono text-sm font-semibold">
                                                                {request.hours}h
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-sm">
                                                            {formatCurrency(Number(baseSalary))}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="flex items-center gap-1 cursor-help">
                                                                        <DollarSign className="w-3 h-3 text-green-600" />
                                                                        <span className="font-mono text-sm font-bold text-green-600">
                                                                            {formatCurrency(calculatedAmount)}
                                                                        </span>
                                                                        <Info className="w-3 h-3 text-muted-foreground" />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="text-xs">
                                                                        ({formatCurrency(Number(baseSalary))} ÷ 240) × {request.hours} × 1.5
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isApproved ? (
                                                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Approved
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline">Pending</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Close
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || loading || selectedRequestIds.length === 0}
                    >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Approve {selectedRequestIds.length > 0 && `(${selectedRequestIds.length})`} for Salary
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
