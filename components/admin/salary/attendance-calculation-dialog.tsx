"use client";

import { useState } from "react";
import { Calendar, Loader2, Save } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    calculateAttendanceStats,
    createAttendanceSalary,
    updateAttendanceSalary,
    getEmployeeAttendanceSalary,
} from "@/app/actions/attendance-salary-actions";

type Employee = {
    id: string;
    employee_id: string;
    full_name: string;
    email: string;
    base_salary: number | null;
};

type AttendanceCalculationDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
};

export function AttendanceCalculationDialog({
    open,
    onOpenChange,
    employee,
}: AttendanceCalculationDialogProps) {
    const [month, setMonth] = useState<string>(
        new Date().toISOString().substring(0, 7)
    );
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState<any>(null);
    const [existingRecord, setExistingRecord] = useState<any>(null);
    const [calculatedAmount, setCalculatedAmount] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    const handleCalculate = async () => {
        if (!employee) return;

        try {
            setCalculating(true);

            // Calculate attendance stats
            const statsResult = await calculateAttendanceStats(employee.id, month);
            if (!statsResult.success) {
                throw new Error(statsResult.error);
            }

            setAttendanceStats(statsResult.data);

            // Check if record already exists
            const existingResult = await getEmployeeAttendanceSalary(employee.id, month);
            if (existingResult.success && existingResult.data) {
                setExistingRecord(existingResult.data);
                setCalculatedAmount(existingResult.data.calculated_amount.toString());
                setNotes(existingResult.data.notes || "");
            } else {
                setExistingRecord(null);
                setCalculatedAmount("");
                setNotes("");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to calculate attendance");
        } finally {
            setCalculating(false);
        }
    };

    const handleSave = async () => {
        if (!employee || !attendanceStats) return;

        try {
            setSaving(true);

            const totalWorkingDays =
                (attendanceStats.present || 0) * 1 +
                (attendanceStats.half_day || 0) * 0.5;

            const data = {
                employee_id: employee.id,
                month: month,
                absent_days: attendanceStats.absent,
                half_days: attendanceStats.half_day,
                leave_days: attendanceStats.leave,
                poya_days: attendanceStats.poya,
                holiday_days: attendanceStats.holiday,
                unpaid_leave_days: attendanceStats.unpaid_leave,
                total_working_days: totalWorkingDays,
                calculated_amount: parseFloat(calculatedAmount) || 0,
                notes: notes,
            };

            let result;
            if (existingRecord) {
                result = await updateAttendanceSalary(existingRecord.id, data);
            } else {
                result = await createAttendanceSalary(data);
            }

            if (!result.success) {
                throw new Error(result.error);
            }

            toast.success(
                existingRecord
                    ? "Attendance salary record updated successfully"
                    : "Attendance salary record saved successfully"
            );
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save attendance salary record");
        } finally {
            setSaving(false);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            // Reset state when closing
            setAttendanceStats(null);
            setExistingRecord(null);
            setCalculatedAmount("");
            setNotes("");
        }
        onOpenChange(isOpen);
    };

    if (!employee) return null;

    const totalWorkingDays = attendanceStats
        ? (attendanceStats.present || 0) * 1 +
        (attendanceStats.half_day || 0) * 0.5
        : 0;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Attendance Salary Calculation</DialogTitle>
                    <DialogDescription>
                        Calculate and save attendance-based salary information for{" "}
                        {employee.full_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Employee Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Employee Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Employee ID
                                </p>
                                <p className="text-sm font-semibold">{employee.employee_id}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Name</p>
                                <p className="text-sm font-semibold">{employee.full_name}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <p className="text-sm font-semibold">{employee.email}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Base Salary
                                </p>
                                <p className="text-sm font-semibold">
                                    {employee.base_salary
                                        ? `LKR ${employee.base_salary.toLocaleString()}`
                                        : "Not Set"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Month Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="month">Calculation Period</Label>
                        <div className="flex gap-2">
                            <Input
                                id="month"
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleCalculate} disabled={calculating}>
                                {calculating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Calculate
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Attendance Statistics */}
                    {attendanceStats && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">
                                        Attendance Breakdown
                                    </CardTitle>
                                    {existingRecord && (
                                        <Badge variant="secondary">Record Exists</Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Present Days
                                        </p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {attendanceStats.present || 0}
                                        </p>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Absent Days
                                        </p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {attendanceStats.absent}
                                        </p>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Half Days
                                        </p>
                                        <p className="text-2xl font-bold text-orange-600">
                                            {attendanceStats.half_day}
                                        </p>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Leave Days
                                        </p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {attendanceStats.leave}
                                        </p>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Poya Days
                                        </p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {attendanceStats.poya}
                                        </p>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Holiday Days
                                        </p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {attendanceStats.holiday}
                                        </p>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Unpaid Leave Days
                                        </p>
                                        <p className="text-2xl font-bold text-amber-600">
                                            {attendanceStats.unpaid_leave}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Total Working Days
                                        </p>
                                        <p className="text-2xl font-bold">{totalWorkingDays}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Salary Calculation */}
                    {attendanceStats && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="calculated_amount">
                                    Calculated Salary Amount (LKR)
                                </Label>
                                <Input
                                    id="calculated_amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter calculated amount"
                                    value={calculatedAmount}
                                    onChange={(e) => setCalculatedAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add any additional notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !attendanceStats}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {existingRecord ? "Update" : "Save"}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
