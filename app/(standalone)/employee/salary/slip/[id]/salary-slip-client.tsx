"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Printer, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { approveSalarySlip, disputeSalarySlip } from "@/app/actions/salary-slip-actions";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface SalarySlipProps {
    payment: any;
}

export function SalarySlipClient({ payment }: SalarySlipProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [status, setStatus] = useState(payment.employee_status);
    const [adminStatus, setAdminStatus] = useState(payment.admin_approval_status || 'pending');

    // Dispute State
    const [isDisputeOpen, setIsDisputeOpen] = useState(false);
    const [disputeReason, setDisputeReason] = useState("");
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

    const employee = payment.employee;
    const profile = employee?.profile;
    const department = employee?.department;
    const designation = employee?.designation;

    const monthStr = payment.month; // YYYY-MM
    const monthDate = new Date(`${monthStr}-01`);

    const additions = Array.isArray(payment.additions) ? payment.additions : [];
    const deductions = Array.isArray(payment.deductions) ? payment.deductions : [];

    const basicSalary = payment.base_amount || 0;

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            await approveSalarySlip(payment.id);
            setStatus('approved');
            toast.success("Salary slip approved successfully");
        } catch (error) {
            toast.error("Failed to approve salary slip");
        } finally {
            setIsApproving(false);
        }
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) {
            toast.error("Please provide a reason for the dispute");
            return;
        }
        setIsSubmittingDispute(true);
        try {
            await disputeSalarySlip(payment.id, disputeReason);
            setStatus('disputed');
            setIsDisputeOpen(false);
            toast.success("Salary slip disputed successfully");
        } catch (error) {
            toast.error("Failed to submit dispute");
        } finally {
            setIsSubmittingDispute(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50/50 py-8 px-4 print:p-0 print:bg-white">
            <div className="max-w-4xl mx-auto space-y-6 print:space-y-0">

                {/* Actions Bar - Hidden in Print */}
                <div className="flex items-center justify-between no-print print:hidden">
                    <h1 className="text-2xl font-bold">Salary Slip</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrint} size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                    </div>
                </div>

                {/* Paper Slip Design */}
                <Card className="p-8 md:p-12 shadow-sm bg-white print:shadow-none print:border-none print:p-0">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight mb-2">coullax</h1>
                            <h2 className="text-xl font-semibold text-gray-700">Pay Slip</h2>

                            <div className="mt-6 space-y-1 text-sm">
                                <p className="font-semibold text-gray-900 mb-2">Employee Details :</p>
                                <div className="grid grid-cols-[100px_1fr] gap-x-2">
                                    <span className="text-gray-600">EPF No</span>
                                    <span className="font-medium">- {employee?.employee_id || 'N/A'}</span>

                                    <span className="text-gray-600">Full Name</span>
                                    <span className="font-medium">- {profile?.full_name || 'N/A'}</span>

                                    <span className="text-gray-600">NIC</span>
                                    <span className="font-medium">- {'-'}</span>

                                    <span className="text-gray-600">Department</span>
                                    <span className="font-medium">- {department?.name || 'N/A'}</span>

                                    <span className="text-gray-600">Position</span>
                                    <span className="font-medium">- {designation?.title || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right mt-6 md:mt-0 text-sm">
                            <div className="flex flex-col items-end gap-1 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">🌐</span>
                                    <span>www.coullax.com</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">📧</span>
                                    <span>support@coullax.com</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">📞</span>
                                    <span>+94 11 214 2278 | +94 70 11 777 11</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 border border-gray-300 text-center mb-4 text-xs">
                                <div className="p-1 border-r border-gray-300 bg-gray-50 font-medium">Start Date</div>
                                <div className="p-1 border-r border-gray-300 bg-gray-50 font-medium">End Date</div>
                                <div className="p-1 bg-gray-50 font-medium">Pay type</div>

                                <div className="p-1 border-r border-gray-300 border-t">{format(monthDate, '01.MM.yyyy')}</div>
                                <div className="p-1 border-r border-gray-300 border-t">{format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), 'dd.MM.yyyy')}</div>
                                <div className="p-1 border-t">Monthly</div>
                            </div>

                            <div className="grid grid-cols-[auto_1fr] gap-x-2 text-left mb-2">
                                <span className="text-gray-600 text-xs">Leaves Allowed</span>
                                <span className="text-xs font-medium">- 13</span>
                                <span className="text-gray-600 text-xs">Leave Taken</span>
                                <span className="text-xs font-medium">- 0</span>
                                <span className="text-gray-600 text-xs">No Pay Leave</span>
                                <span className="text-xs font-medium">- 00</span>
                            </div>

                            <div className="mt-4">
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                    {format(monthDate, 'MMMM')}
                                </p>
                                <p className="text-2xl font-bold">
                                    {format(monthDate, 'yyyy')}
                                </p>
                            </div>

                            <p className="mt-4 text-xs text-gray-500">
                                Account Number - Not Available<br />
                                Bank, Branch - Not Available
                            </p>
                        </div>
                    </div>

                    {/* Earnings Table */}
                    <div className="mb-8">
                        <div className="grid grid-cols-[1fr_100px_100px_150px] border-b border-gray-200 pb-2 mb-2 font-bold text-sm uppercase tracking-wider text-gray-500">
                            <div>Earnings</div>
                            <div className="text-center">Days</div>
                            <div className="text-center">Hours</div>
                            <div className="text-right">Amount</div>
                        </div>

                        <div className="space-y-2 text-sm">
                            {/* Basic Salary */}
                            <div className="grid grid-cols-[1fr_100px_100px_150px]">
                                <div className="font-medium">Basic Salary</div>
                                <div className="text-center text-gray-500">-</div>
                                <div className="text-center text-gray-500">-</div>
                                <div className="text-right font-medium">{basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR</div>
                            </div>

                            {/* Allowances Section */}
                            {additions.length > 0 && (
                                <div className="mt-4">
                                    <p className="font-semibold text-gray-900 mb-2">Allowances:</p>
                                    {additions.map((item: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-[1fr_100px_100px_150px] mb-1">
                                            <div className="pl-4 text-gray-600">{item.name}</div>
                                            <div className="text-center text-gray-500"></div>
                                            <div className="text-center text-gray-500"></div>
                                            <div className="text-right">{Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-gray-200 mt-4 pt-2 grid grid-cols-[1fr_150px]">
                                <div className="text-right pr-4 font-semibold text-gray-700">Total Allowances</div>
                                <div className="text-right font-semibold">
                                    {additions.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR
                                </div>
                            </div>

                            <div className="grid grid-cols-[1fr_150px] pt-1">
                                <div className="text-right pr-4 font-bold text-gray-900">Gross Salary</div>
                                <div className="text-right font-bold">
                                    {payment.gross_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deductions Table */}
                    <div className="mb-8">
                        <div className="grid grid-cols-[1fr_150px] border-b border-gray-200 pb-2 mb-2 font-bold text-sm uppercase tracking-wider text-gray-500">
                            <div>Deductions</div>
                            <div className="text-right">Amount</div>
                        </div>

                        <div className="space-y-2 text-sm">
                            {deductions.map((item: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-[1fr_150px]">
                                    <div className="font-medium text-gray-600">{item.name}</div>
                                    <div className="text-right">{Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR</div>
                                </div>
                            ))}

                            {deductions.length === 0 && (
                                <div className="text-gray-400 italic text-sm">No deductions</div>
                            )}

                            <div className="border-t border-gray-200 mt-4 pt-2 grid grid-cols-[1fr_150px]">
                                <div className="text-right pr-4 font-semibold text-gray-700">Total Deductions</div>
                                <div className="text-right font-semibold">
                                    {payment.deductions.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR
                                </div>
                            </div>

                            <div className="grid grid-cols-[1fr_150px] pt-2">
                                <div className="text-right pr-4 font-bold text-xl text-gray-900">Net Pay</div>
                                <div className="text-right font-bold text-xl">
                                    {payment.net_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Employer Contributions */}
                    <div className="mb-12">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2 mb-2">Employer Contributions</h3>
                        <div className="grid grid-cols-[1fr_150px] text-sm">
                            <div className="text-gray-600">EPF (12%)</div>
                            <div className="text-right">{(basicSalary * 0.12).toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR</div>
                        </div>
                        <div className="grid grid-cols-[1fr_150px] text-sm">
                            <div className="text-gray-600">ETF (3%)</div>
                            <div className="text-right">{(basicSalary * 0.03).toLocaleString('en-US', { minimumFractionDigits: 2 })} LKR</div>
                        </div>
                    </div>


                    {/* Footer Info */}
                    <div className="text-[10px] text-gray-500 space-y-1 border-t border-gray-200 pt-4 mb-8">
                        <p>• The start date and end date represents the period for which this pay slip is issued.</p>
                        <p>• Earnings include the employee's base salary, overtime pay, commission, performance bonus, and any other additional earnings.</p>
                        <p>• Deductions cover taxes, social security contributions, health insurance premiums, and any other applicable deductions.</p>
                        <p>• Net Pay represents the amount the employee will receive after deducting all applicable taxes and deductions.</p>
                        <p>• For any queries or concerns, please contact the Management.</p>
                        <p>• Consolidated salary = Basic salary + BRA</p>
                        <p className="mt-2 text-xs italic text-gray-400">
                            This pay slip is intended solely for the use of the individual named above and contains confidential and privileged information.
                            Unauthorized use, disclosure, or copying of this pay slip is strictly prohibited.
                        </p>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-3 gap-8 pt-8 mt-4">
                        <div className="text-center">
                            <div className="h-16 flex items-end justify-center">
                                {/* Placeholder Signature */}
                                <div className="font-cursive text-2xl text-gray-400">Admin</div>
                            </div>
                            <div className="border-t border-dotted border-gray-400 pt-2 font-medium text-sm">Accountant</div>
                        </div>
                        <div className="text-center">
                            <div className="h-16 flex items-end justify-center">
                                {/* Placeholder Signature */}
                                <div className="font-cursive text-2xl text-gray-400">Coullax</div>
                            </div>
                            <div className="border-t border-dotted border-gray-400 pt-2 font-medium text-sm">Coullax Management</div>
                        </div>
                        <div className="text-center">
                            <div className="h-16 flex items-end justify-center">
                                {status === 'approved' ? (
                                    <div className="text-green-600 font-bold border-2 border-green-600 rounded px-2 rotate-[-10deg]">APPROVED</div>
                                ) : (
                                    <div className="text-gray-300">Pending</div>
                                )}
                            </div>
                            <div className="border-t border-dotted border-gray-400 pt-2 font-medium text-sm">Employee</div>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-xs text-gray-400">
                        © {new Date().getFullYear()} coullax (pvt) ltd. All rights reserved.
                    </div>

                </Card>

                {/* Approval Action Area */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between no-print print:hidden">
                    <div>
                        <h3 className="font-semibold text-lg">Action Required</h3>
                        <p className="text-sm text-gray-500">
                            {status === 'approved'
                                ? "You have successfully approved this salary slip."
                                : "Please review the details above and approve your salary slip."
                            }
                        </p>
                    </div>

                    {status === 'approved' ? (
                        <div className="flex items-center gap-2 text-green-600 font-medium px-4 py-2 bg-green-50 rounded-lg">
                            <CheckCircle2 className="w-5 h-5" />
                            Acknowledged
                        </div>
                    ) : status === 'disputed' ? (
                        <div className="flex items-center gap-2 text-red-600 font-medium px-4 py-2 bg-red-50 rounded-lg">
                            <AlertCircle className="w-5 h-5" />
                            Disputed
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                        Dispute
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Dispute Salary Slip</DialogTitle>
                                        <DialogDescription>
                                            Please provide a reason for your dispute. This will be sent to the admin for review.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-2 py-4">
                                        <Label>Reason</Label>
                                        <Textarea
                                            value={disputeReason}
                                            onChange={(e) => setDisputeReason(e.target.value)}
                                            placeholder="Explain the issue with your salary slip..."
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsDisputeOpen(false)}>Cancel</Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleDispute}
                                            disabled={isSubmittingDispute}
                                        >
                                            {isSubmittingDispute ? "Submitting..." : "Submit Dispute"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="gap-2"
                            >
                                {isApproving ? "Processing..." : "Approve Salary Slip"}
                                {!isApproving && <CheckCircle2 className="w-4 h-4" />}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Timeline Section */}
                <Card className="p-6 no-print print:hidden">
                    <h3 className="font-semibold text-lg mb-6">Approval Timeline</h3>
                    <div className="relative flex justify-between items-center max-w-3xl mx-auto">
                        {/* Progress Bar Background */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2" />

                        {/* Progress Bar Fill */}
                        <div
                            className={cn(
                                "absolute top-1/2 left-0 h-1 bg-green-600 -z-10 -translate-y-1/2 transition-all duration-500",
                                status === 'approved' && adminStatus === 'approved' ? "w-full" :
                                    status === 'approved' ? "w-1/2" : "w-0"
                            )}
                        />

                        {/* Step 1: Processed */}
                        <div className="flex flex-col items-center gap-2 bg-white px-2">
                            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-sm">Processed</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(payment.created_at || new Date()), 'dd MMM yyyy')}</p>
                            </div>
                        </div>

                        {/* Step 2: Employee Approval */}
                        <div className="flex flex-col items-center gap-2 bg-white px-2">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-2",
                                status === 'approved' ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-300 text-gray-300"
                            )}>
                                {status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-3 h-3 rounded-full bg-current" />}
                            </div>
                            <div className="text-center">
                                <p className={cn("font-medium text-sm", status === 'approved' ? "text-green-700" : "text-gray-500")}>
                                    Employee Acknowledged
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {payment.employee_approved_at ? format(new Date(payment.employee_approved_at), 'dd MMM yyyy') :
                                        (status === 'approved' ? 'Just now' : 'Pending')}
                                </p>
                            </div>
                        </div>

                        {/* Step 3: Admin Approval */}
                        <div className="flex flex-col items-center gap-2 bg-white px-2">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-2",
                                adminStatus === 'approved' ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-300 text-gray-300"
                            )}>
                                {adminStatus === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-3 h-3 rounded-full bg-current" />}
                            </div>
                            <div className="text-center">
                                <p className={cn("font-medium text-sm", adminStatus === 'approved' ? "text-green-700" : "text-gray-500")}>
                                    Official Assessment
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {payment.admin_approved_at ? format(new Date(payment.admin_approved_at), 'dd MMM yyyy') : 'Pending'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
