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
import { bulkMarkAttendance, validateEmployeeIds, BulkAttendanceRecord } from '@/app/actions/bulk-attendance-actions'

interface BulkReviewClientProps {
  initialRecords: AttendanceRecord[]
}

interface EditableRecord extends AttendanceRecord {
  employeeDbId?: string
  validationStatus: 'valid' | 'invalid' | 'pending'
  approved?: boolean
}

export function BulkReviewClient({ initialRecords }: BulkReviewClientProps) {
  const router = useRouter()
  const [records, setRecords] = useState<EditableRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [approvingRowIndex, setApprovingRowIndex] = useState<number | null>(null)

  // Validate employee IDs on mount ONLY - do not re-run when records change
  useEffect(() => {
    async function validateRecords() {
      try {
        const personIds = initialRecords.map(r => r.personId)
        const employeeMap = await validateEmployeeIds(personIds)

        const validatedRecords: EditableRecord[] = initialRecords.map(record => {
          const employeeDbId = employeeMap.get(record.personId)
          return {
            ...record,
            employeeDbId,
            validationStatus: employeeDbId ? 'valid' : 'invalid',
            error: employeeDbId ? record.error : (record.error || 'Employee not found in database'),
            approved: false,
          }
        })

        setRecords(validatedRecords)
      } catch (error) {
        console.error('Error validating records:', error)
        toast.error('Failed to validate employee records')
      } finally {
        setLoading(false)
      }
    }

    validateRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - run only once on mount

  const updateRecord = (index: number, field: keyof EditableRecord, value: any) => {
    setRecords(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const hasErrors = (record: EditableRecord): boolean => {
    return !!(record.error || !record.checkIn || !record.checkOut)
  }

  const handleApproveRow = async (index: number) => {
    const record = records[index]
    
    // Check for errors
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
      // Submit single record
      const bulkRecord: BulkAttendanceRecord = {
        employeeId: record.employeeDbId!,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
        notes: `Bulk upload - ${record.department || ''} ${record.position || ''}`.trim(),
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

      // Navigate back to attendance page
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
            onClick={() => router.back()}
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={() => {if(submitting || validCount === 0 || errorCount > 0){
              toast.error('invalid records found. please check the records')
            }else{
              setShowConfirmDialog(true)
            }}}
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
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => {
                  const hasNullTimes = !record.checkIn || !record.checkOut
                  const recordHasErrors = hasErrors(record)
                  const rowClassName = record.validationStatus === 'invalid' 
                    ? 'bg-red-50 dark:bg-red-950/20' 
                    : hasNullTimes 
                      ? 'bg-amber-50 dark:bg-amber-950/20' 
                      : ''
                  
                  // Use a stable unique key for React
                  const recordKey = `${record.personId}-${record.date}`
                  
                  return (
                    <TableRow key={recordKey} className={rowClassName}>
                      <TableCell>
                        {record.validationStatus === 'valid' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{record.personId}</TableCell>
                      <TableCell>{record.name}</TableCell>
                      <TableCell>{record.department}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.dayOfWeek}</TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={record.checkIn || ''}
                          onChange={(e) => updateRecord(index, 'checkIn', e.target.value || null)}
                          className=""
                          step="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={record.checkOut || ''}
                          onChange={(e) => updateRecord(index, 'checkOut', e.target.value || null)}
                          className=" "
                          step="1"
                        />
                      </TableCell>
                      <TableCell>
                        {record.error && (
                          <Badge variant="destructive" className="text-xs">
                            {record.error}
                          </Badge>
                        )}
                        {!record.error && !record.checkIn && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            Missing check-in time
                          </Badge>
                        )}
                        {!record.error && record.checkIn && !record.checkOut && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            Missing check-out time
                          </Badge>
                        )}
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
