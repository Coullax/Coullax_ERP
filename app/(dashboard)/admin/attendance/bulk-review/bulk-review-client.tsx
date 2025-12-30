'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { AttendanceRecord } from '@/lib/excel-parser'
import { bulkMarkAttendance, validateEmployeeIds, BulkAttendanceRecord, checkLeaveConflicts } from '@/app/actions/bulk-attendance-actions'
import { getHolidays } from '@/lib/holiday-utils'
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

interface BulkReviewClientProps {
  storageKey: string
}

interface EditableRecord extends AttendanceRecord {
  employeeDbId?: string
  validationStatus: 'valid' | 'invalid' | 'pending'
  approved?: boolean
  isHoliday?: boolean
  holidayName?: string
  isPoya?: boolean
  poyaName?: string
  onLeave?: boolean
  leaveType?: string
}

export function BulkReviewClient({ storageKey }: BulkReviewClientProps) {
  const router = useRouter()
  const [records, setRecords] = useState<EditableRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [approvingRowIndex, setApprovingRowIndex] = useState<number | null>(null)
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map())
  const [poyas, setPoyas] = useState<Map<string, string>>(new Map())

  // Load data from sessionStorage and validate employee IDs on mount
  useEffect(() => {
    async function loadAndValidateRecords() {
      try {
        // Retrieve data from sessionStorage
        const storedData = sessionStorage.getItem(storageKey)

        if (!storedData) {
          toast.error('Session expired. Please upload the file again.')
          router.push('/admin/attendance')
          return
        }

        const initialRecords: AttendanceRecord[] = JSON.parse(storedData)

        if (!Array.isArray(initialRecords) || initialRecords.length === 0) {
          toast.error('Invalid attendance data. Please upload the file again.')
          router.push('/admin/attendance')
          return
        }

        // Validate employee IDs
        const personIds = initialRecords.map(r => r.personId)
        const employeeMap = await validateEmployeeIds(personIds)

        // Fetch holidays for the date range
        const dates = initialRecords.map(r => parseISO(r.date))
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
        const holidayData = await getHolidays(minDate, maxDate)

        // Create holiday and poya maps
        const holidayMap = new Map<string, string>()
        const poyaMap = new Map<string, string>()
        holidayData.forEach(holiday => {
          const startDate = parseISO(holiday.start_time)
          const endDate = parseISO(holiday.end_time)

          // Add all dates in the holiday/poya range
          let currentDate = new Date(startDate)
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0]
            const eventType = (holiday as any).event_type || 'holiday'

            if (eventType === 'holiday') {
              holidayMap.set(dateStr, holiday.title)
            } else if (eventType === 'poya') {
              poyaMap.set(dateStr, holiday.title)
            }
            currentDate.setDate(currentDate.getDate() + 1)
          }
        })
        setHolidays(holidayMap)
        setPoyas(poyaMap)

        // Check for leave conflicts
        const validEmployeeIds = initialRecords
          .map(r => employeeMap.get(r.personId))
          .filter(id => id !== undefined) as string[]
        const allDates = initialRecords.map(r => r.date)
        const leaveConflicts = await checkLeaveConflicts(validEmployeeIds, allDates)

        const validatedRecords: EditableRecord[] = initialRecords.map(record => {
          const employeeDbId = employeeMap.get(record.personId)
          const holidayName = holidayMap.get(record.date)
          const isHoliday = !!holidayName
          const poyaName = poyaMap.get(record.date)
          const isPoya = !!poyaName

          // Check for leave conflict
          const leaveKey = employeeDbId ? `${employeeDbId}-${record.date}` : ''
          const leaveType = leaveKey ? leaveConflicts.get(leaveKey) : undefined
          const onLeave = !!leaveType

          // Auto-set status based on conditions
          let status = record.status
          if (isHoliday) {
            status = 'holiday'
          } else if (isPoya) {
            status = 'poya'
          } else if (onLeave) {
            status = 'leave'
          }

          return {
            ...record,
            status, // Use the auto-set status
            employeeDbId,
            validationStatus: employeeDbId ? 'valid' : 'invalid',
            error: employeeDbId ? record.error : (record.error || 'Employee not found in database'),
            approved: false,
            isHoliday,
            holidayName,
            isPoya,
            poyaName,
            onLeave,
            leaveType,
          }
        })

        setRecords(validatedRecords)
      } catch (error) {
        console.error('Error loading/validating records:', error)
        toast.error('Failed to load attendance data. Please try again.')
        router.push('/admin/attendance')
      } finally {
        setLoading(false)
      }
    }

    loadAndValidateRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]) // Run when storageKey changes

  const updateRecord = (index: number, field: keyof EditableRecord, value: any) => {
    setRecords(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const calculateLeaveDeduction = (record: EditableRecord) => {
    if (!record.onLeave || !record.employeeDbId || !record.leaveType) {
      console.log('No leave deduction needed:', { onLeave: record.onLeave, employeeDbId: record.employeeDbId, leaveType: record.leaveType })
      return undefined
    }

    const hasBothTimes = record.checkIn && record.checkOut
    const hasNoTimes = !record.checkIn && !record.checkOut

    // Determine deduction based on status and times
    let daysToDeduct = 0
    let shouldCancelLeave = false

    if (record.status === 'leave' && hasNoTimes) {
      // Employee took the leave - no deduction, keep leave request
      daysToDeduct = 0
      shouldCancelLeave = false
    } else if (record.status === 'half_day' && hasBothTimes) {
      // Employee worked half day - deduct 0.5 days, cancel leave
      daysToDeduct = 0.5
      shouldCancelLeave = true
    } else if (record.status === 'present' && hasBothTimes) {
      // Employee came to work - deduct 1 day, cancel leave
      daysToDeduct = 1
      shouldCancelLeave = true
    }

    const deduction = {
      employeeId: record.employeeDbId,
      leaveType: record.leaveType,
      daysToDeduct,
      shouldCancelLeave,
    }

    console.log('Leave deduction calculated:', deduction)
    return deduction
  }

  const hasErrors = (record: EditableRecord): boolean => {
    // For holidays: error if any times are filled (both must be null to approve)
    if (record.isHoliday) {
      const hasAnyTimes = record.checkIn || record.checkOut
      return !!(record.error || hasAnyTimes)
    }

    // For other records: validate based on times and status
    const hasBothTimes = record.checkIn && record.checkOut
    const hasNoTimes = !record.checkIn && !record.checkOut
    const hasPartialTimes = (record.checkIn && !record.checkOut) || (!record.checkIn && record.checkOut)

    // Partial times are always an error
    if (hasPartialTimes) {
      return true
    }

    // Both times missing: status must be 'absent' or 'leave'
    if (hasNoTimes) {
      const validStatusForNoTimes = record.status === 'absent' || record.status === 'leave'
      return !!(record.error || !validStatusForNoTimes)
    }

    // Both times filled: status must be 'present', 'half_day', or 'poya'
    if (hasBothTimes) {
      const validStatusForFilledTimes = record.status === 'present' || record.status === 'half_day' || record.status === 'poya'
      return !!(record.error || !validStatusForFilledTimes)
    }

    return !!record.error
  }

  const handleApproveRow = async (index: number) => {
    const record = records[index]

    // Check for errors
    if (record.isHoliday) {
      // For holidays, block if any times are filled
      const hasAnyTimes = record.checkIn || record.checkOut
      if (hasAnyTimes) {
        toast.error('Cannot approve holiday with attendance times. Clear check-in/check-out times first.')
        return
      }
      // Only allow approval if both times are null
    }

    // Leave conflicts are now allowed - will deduct from leave balance

    if (hasErrors(record)) {
      toast.error('Please fix all errors before approving this row')
      return
    }

    if (record.validationStatus === 'invalid') {
      toast.error('Cannot approve row with invalid employee')
      return
    }

    setApprovingRowIndex(index)

    try {
      // Calculate leave deduction if employee is on leave
      const leaveDeduction = calculateLeaveDeduction(record)

      // Submit single record
      const bulkRecord: BulkAttendanceRecord = {
        employeeId: record.employeeDbId!,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
        notes: `Bulk upload - ${record.department || ''} ${record.position || ''}`.trim(),
        leaveDeduction,
      }

      console.log('Submitting record:', bulkRecord)
      const result = await bulkMarkAttendance([bulkRecord])
      console.log('Result:', result)

      if (result.success > 0) {
        const recordKey = `${record.personId}-${record.date}`
        console.log('Removing record with key:', recordKey)
        console.log('Current records count:', records.length)

        // Show success toast
        toast.success(`Approved attendance for ${record.name}`)

        // Use setTimeout to ensure state updates happen after current render cycle
        setTimeout(() => {
          setApprovingRowIndex(null)
          setRecords(prev => {
            const filtered = prev.filter(r => `${r.personId}-${r.date}` !== recordKey)
            console.log('New records count:', filtered.length)
            return filtered
          })
        }, 0)
      } else {
        setApprovingRowIndex(null)
        toast.error(`Failed to approve: ${result.errors[0]?.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error approving row:', error)
      setApprovingRowIndex(null)
      toast.error(error.message || 'Failed to approve row')
    }
  }

  const handleIgnoreRow = (index: number) => {
    const record = records[index]
    const recordKey = `${record.personId}-${record.date}`

    // Remove the row without submitting
    setRecords(prev => prev.filter(r => `${r.personId}-${r.date}` !== recordKey))
    toast.info(`Skipped ${record.name}`)
  }

  const handleApprove = async () => {
    // Check if there are any errors in remaining records
    const recordsWithErrors = records.filter(r => hasErrors(r))

    if (recordsWithErrors.length > 0) {
      // Count specific error types
      const nullCheckInCount = records.filter(r => !r.checkIn).length
      const nullCheckOutCount = records.filter(r => !r.checkOut).length
      const validationErrorCount = records.filter(r => r.error).length

      // Build specific error message
      let errorMessage = `Cannot approve: ${recordsWithErrors.length} row(s) have errors. `
      const issues = []

      if (nullCheckInCount > 0) {
        issues.push(`${nullCheckInCount} missing check-in time`)
      }
      if (nullCheckOutCount > 0) {
        issues.push(`${nullCheckOutCount} missing check-out time`)
      }
      if (validationErrorCount > 0) {
        issues.push(`${validationErrorCount} validation errors`)
      }

      if (issues.length > 0) {
        errorMessage += `Please fill: ${issues.join(', ')}`
      }

      toast.error(errorMessage)
      return
    }

    setSubmitting(true)
    setShowConfirmDialog(false)

    try {
      // Filter only valid records
      const validRecords = records.filter(r => r.validationStatus === 'valid' && r.employeeDbId)

      if (validRecords.length === 0) {
        toast.error('No valid records to submit')
        setSubmitting(false)
        return
      }

      // Convert to bulk attendance records
      const bulkRecords: BulkAttendanceRecord[] = validRecords.map(record => ({
        employeeId: record.employeeDbId!,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
        notes: `Bulk upload - ${record.department || ''} ${record.position || ''}`.trim(),
        leaveDeduction: calculateLeaveDeduction(record),
      }))

      // Submit bulk attendance
      const result = await bulkMarkAttendance(bulkRecords)

      if (result.success > 0) {
        toast.success(`Successfully marked attendance for ${result.success} record(s)`)
      }

      if (result.failed > 0) {
        toast.error(`Failed to mark attendance for ${result.failed} record(s)`)
        console.error('Failed records:', result.errors)
      }

      // Clear sessionStorage and navigate back
      sessionStorage.removeItem(storageKey)
      router.push('/admin/attendance')
    } catch (error: any) {
      console.error('Error submitting bulk attendance:', error)
      toast.error(error.message || 'Failed to submit bulk attendance')
      setSubmitting(false)
    }
  }

  const validCount = records.filter(r => r.validationStatus === 'valid').length
  const invalidCount = records.filter(r => r.validationStatus === 'invalid').length
  const errorCount = records.filter(r => hasErrors(r)).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Validating employee records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Bulk Attendance</h1>
          <p className="text-gray-500 mt-1">
            Review and edit attendance records before approval
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem(storageKey)
              router.back()
            }}
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (submitting || validCount === 0 || errorCount > 0) {
                toast.error('invalid records found. please check the records')
              } else {
                setShowConfirmDialog(true)
              }
            }}
          // disabled={submitting || validCount === 0 || errorCount > 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Approve All ({validCount - errorCount})
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Records</p>
                <p className="text-3xl font-bold mt-2">{records.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Valid Records</p>
                <p className="text-3xl font-bold mt-2 text-green-600">{validCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Invalid Records</p>
                <p className="text-3xl font-bold mt-2 text-red-600">{invalidCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => {
                  const hasNullTimes = !record.checkIn || !record.checkOut
                  const recordHasErrors = hasErrors(record)

                  // Background color only for records with errors
                  const rowClassName = recordHasErrors
                    ? record.error
                      ? 'bg-red-50 dark:bg-red-950/20'  // Validation errors (employee not found)
                      : record.isHoliday
                        ? 'bg-gray-50 dark:bg-gray-950/20'  // Holiday with times
                        : hasNullTimes
                          ? 'bg-amber-50 dark:bg-amber-950/20'  // Missing times
                          : 'bg-amber-50 dark:bg-amber-950/20'  // Other errors (status validation, etc.)
                    : ''  // No background for valid records

                  // Use a stable unique key for React
                  const recordKey = `${record.personId}-${record.date}`

                  return (
                    <TableRow key={recordKey} className={rowClassName}>
                      <TableCell>
                        {/* Status icon based on error priority */}
                        {record.error ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : record.isHoliday ? (
                          <AlertCircle className="h-5 w-5 text-gray-600" />
                        ) : record.isPoya ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        ) : hasNullTimes ? (
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{record.personId}</TableCell>
                      <TableCell>{record.name}</TableCell>
                      <TableCell>{record.department}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.dayOfWeek}</TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            type="time"
                            value={record.checkIn || ''}
                            onChange={(e) => updateRecord(index, 'checkIn', e.target.value || null)}
                            className="pr-8"
                            step="1"
                          />
                          {/* Clear button inside input */}
                          {record.checkIn && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateRecord(index, 'checkIn', null)}
                              className="absolute right-0 top-0 h-full w-8 p-0 hover:bg-transparent"
                              title="Clear check-in time"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            type="time"
                            value={record.checkOut || ''}
                            onChange={(e) => updateRecord(index, 'checkOut', e.target.value || null)}
                            className="pr-8"
                            step="1"
                          />
                          {/* Clear button inside input */}
                          {record.checkOut && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateRecord(index, 'checkOut', null)}
                              className="absolute right-0 top-0 h-full w-8 p-0 hover:bg-transparent"
                              title="Clear check-out time"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Priority 1: Validation errors (employee not found) */}
                        {record.error && (
                          <Badge variant="destructive" className="text-xs">
                            {record.error}
                          </Badge>
                        )}
                        {/* Priority 2: Leave conflict */}
                        {!record.error && record.onLeave && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            On {record.leaveType} leave
                          </Badge>
                        )}
                        {/* Priority 3: Holiday warning */}
                        {!record.error && !record.onLeave && record.isHoliday && (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                            Holiday: {record.holidayName}
                          </Badge>
                        )}
                        {/* Show Poya badge and missing time warnings together */}
                        {!record.error && !record.onLeave && !record.isHoliday && (
                          <div className="flex flex-row gap-1 flex-wrap">
                            {/* Poya day badge (informational) */}
                            {record.isPoya && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                Poya: {record.poyaName}
                              </Badge>
                            )}
                            {/* Missing check-in time (partial) */}
                            {!record.checkIn && record.checkOut && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                Missing check-in time
                              </Badge>
                            )}
                            {/* Missing check-out time (partial) */}
                            {record.checkIn && !record.checkOut && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                Missing check-out time
                              </Badge>
                            )}
                            {/* Both times null but wrong status */}
                            {!record.checkIn && !record.checkOut && record.status !== 'absent' && record.status !== 'leave' && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                Status must be 'Absent' or 'Leave' when times are null
                              </Badge>
                            )}
                            {/* Both times filled but wrong status */}
                            {record.checkIn && record.checkOut && record.status !== 'present' && record.status !== 'half_day' && record.status !== 'poya' && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                Status must be 'Present' or 'Half Day' when times are filled
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={record.status}
                          onValueChange={(value) => updateRecord(index, 'status', value)}
                          disabled={record.isHoliday}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="half_day">Half Day</SelectItem>
                            <SelectItem value="leave">Leave</SelectItem>
                            <SelectItem value="poya">Poya</SelectItem>
                            <SelectItem value="holiday">Holiday</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApproveRow(index)}
                            disabled={recordHasErrors || record.validationStatus === 'invalid' || approvingRowIndex === index}
                            className="h-8 w-8 p-0"
                            title="Approve this row"
                          >
                            {approvingRowIndex === index ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleIgnoreRow(index)}
                            disabled={approvingRowIndex === index}
                            className="h-8 w-8 p-0"
                            title="Skip this row"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve All Valid Records?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to mark attendance for {validCount - errorCount} employee(s).
              {errorCount > 0 && (
                <span className="block mt-2 text-amber-600">
                  {errorCount} record(s) with errors will be skipped. Please fix them or approve individually.
                </span>
              )}
              {invalidCount > 0 && (
                <span className="block mt-2 text-red-600">
                  {invalidCount} invalid record(s) will be skipped.
                </span>
              )}
              This action will update the attendance records in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={submitting}>
              {submitting ? 'Processing...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
