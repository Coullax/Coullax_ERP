'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { FileDown, Loader2 } from 'lucide-react'
import { getAllEmployees } from '@/app/actions/employee-actions'
import {
    getEmployeeAttendanceForMonth,
    getAllEmployeesAttendanceForMonth,
} from '@/app/actions/attendance-export-actions'
import { generateAttendancePDF, generateBulkAttendancePDF } from '@/lib/attendance-pdf-generator'
import { generateAttendanceExcel, generateBulkAttendanceExcel } from '@/lib/attendance-excel-generator'

interface AttendanceExportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AttendanceExportDialog({ open, onOpenChange }: AttendanceExportDialogProps) {
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)

    const [formData, setFormData] = useState({
        employeeId: 'all',
        month: new Date().getMonth().toString(),
        year: new Date().getFullYear().toString(),
        format: 'pdf',
    })

    // Fetch employees when dialog opens
    useEffect(() => {
        if (open && employees.length === 0) {
            setLoading(true)
            getAllEmployees()
                .then(data => {
                    setEmployees(data || [])
                })
                .catch(err => {
                    console.error('Error fetching employees:', err)
                    toast.error('Failed to load employees')
                })
                .finally(() => {
                    setLoading(false)
                })
        }
    }, [open, employees.length])

    const handleExport = async () => {
        setExporting(true)

        try {
            const month = parseInt(formData.month)
            const year = parseInt(formData.year)

            if (formData.employeeId === 'all') {
                // Export all employees
                await toast.promise(
                    getAllEmployeesAttendanceForMonth(year, month).then(async (allData) => {
                        if (allData.length === 0) {
                            throw new Error('No attendance data found for the selected period')
                        }

                        // Generate the file
                        if (formData.format === 'pdf') {
                            generateBulkAttendancePDF(allData)
                        } else {
                            generateBulkAttendanceExcel(allData)
                        }

                        return allData
                    }),
                    {
                        loading: 'Fetching and generating attendance report...',
                        success: (data) => `Successfully exported attendance for ${data.length} employees`,
                        error: (err) => err.message || 'Failed to export attendance',
                    }
                )
            } else {
                // Export single employee
                await toast.promise(
                    getEmployeeAttendanceForMonth(formData.employeeId, year, month).then(async (data) => {
                        // Generate the file
                        if (formData.format === 'pdf') {
                            generateAttendancePDF(data)
                        } else {
                            generateAttendanceExcel(data)
                        }

                        return data
                    }),
                    {
                        loading: 'Fetching and generating attendance report...',
                        success: (data) => `Successfully exported attendance for ${data.employeeName}`,
                        error: (err) => err.message || 'Failed to export attendance',
                    }
                )
            }

            // Close dialog after successful export
            onOpenChange(false)
        } catch (error: any) {
            console.error('Error exporting attendance:', error)
            // Error is already handled by toast.promise
        } finally {
            setExporting(false)
        }
    }

    // Generate month options
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    // Generate year options (current year and 2 years back)
    const currentYear = new Date().getFullYear()
    const years = [currentYear, currentYear - 1, currentYear - 2]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileDown className="h-5 w-5" />
                        Export Attendance Sheet
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Employee Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="employee">Employee</Label>
                        <Select
                            value={formData.employeeId}
                            onValueChange={value => setFormData({ ...formData, employeeId: value })}
                            disabled={loading || exporting}
                        >
                            <SelectTrigger id="employee">
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.profile?.full_name} ({emp.employee_id})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Month Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="month">Month</Label>
                        <Select
                            value={formData.month}
                            onValueChange={value => setFormData({ ...formData, month: value })}
                            disabled={exporting}
                        >
                            <SelectTrigger id="month">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((month, index) => (
                                    <SelectItem key={index} value={index.toString()}>
                                        {month}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Year Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Select
                            value={formData.year}
                            onValueChange={value => setFormData({ ...formData, year: value })}
                            disabled={exporting}
                        >
                            <SelectTrigger id="year">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Format Selection */}
                    <div className="space-y-2">
                        <Label>Document Format</Label>
                        <RadioGroup
                            value={formData.format}
                            onValueChange={value => setFormData({ ...formData, format: value })}
                            disabled={exporting}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pdf" id="pdf" />
                                <Label htmlFor="pdf" className="font-normal cursor-pointer">
                                    PDF
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="excel" id="excel" />
                                <Label htmlFor="excel" className="font-normal cursor-pointer">
                                    Excel
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={exporting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={loading || exporting}
                    >
                        {exporting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
