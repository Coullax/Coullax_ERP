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
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import { AttendanceRecord } from '@/lib/excel-parser'
import { bulkMarkAttendance, validateEmployeeIds, BulkAttendanceRecord } from '@/app/actions/bulk-attendance-actions'

interface BulkReviewClientProps {
  initialRecords: AttendanceRecord[]
}

interface EditableRecord extends AttendanceRecord {
  employeeDbId?: string
  validationStatus: 'valid' | 'invalid' | 'pending'
}

export function BulkReviewClient({ initialRecords }: BulkReviewClientProps) {
  const router = useRouter()
  const [records, setRecords] = useState<EditableRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Validate employee IDs on mount
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
  }, [initialRecords])

  const updateRecord = (index: number, field: keyof EditableRecord, value: any) => {
    setRecords(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleApprove = async () => {
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
            onClick={() => setShowConfirmDialog(true)}
            disabled={submitting || validCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Approve {validCount} Record(s)
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
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => {
                  const hasNullTimes = !record.checkIn || !record.checkOut
                  const rowClassName = record.validationStatus === 'invalid' 
                    ? 'bg-red-50 dark:bg-red-950/20' 
                    : hasNullTimes 
                      ? 'bg-amber-50 dark:bg-amber-950/20' 
                      : ''
                  
                  return (
                    <TableRow key={index} className={rowClassName}>
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
                          className="w-32"
                          step="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={record.checkOut || ''}
                          onChange={(e) => updateRecord(index, 'checkOut', e.target.value || null)}
                          className="w-32"
                          step="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={record.status}
                          onValueChange={(value) => updateRecord(index, 'status', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="half_day">Half Day</SelectItem>
                            <SelectItem value="leave">Leave</SelectItem>
                          </SelectContent>
                        </Select>
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
            <AlertDialogTitle>Approve Bulk Attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to mark attendance for {validCount} employee(s).
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
