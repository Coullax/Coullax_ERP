'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  createLeaveRequest,
  createOvertimeRequest,
  createTravelRequest,
  createExpenseRequest,
  createAttendanceRegularization,
  createAssetRequest,
  createAssetIssueRequest,
  uploadAssetIssueImage,
  createResignation,
  createCoveringRequest,
  createRequestForCovering,
  uploadExpenseAttachment,
  uploadResignationDocument,
  getDepartmentHeadForEmployee,
  getEmployeePolicySchedule,
  getCoveringHours,
} from '@/app/actions/request-actions'
import { getEmployeeCurrentBalance } from '@/app/actions/policy-actions'
import { getEmployeeInventory } from '@/app/actions/inventory-actions'
import { uploadToB2 } from '@/app/actions/upload-actions'
import { getHolidayDates } from '@/lib/holiday-utils'
import { addMonths, format as formatDate } from 'date-fns'
import { DatePicker } from '@/components/ui/calendar'

interface RequestFormProps {
  employeeId: string
  requestType: string
}

export function RequestForm({ employeeId, requestType }: RequestFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [supervisorName, setSupervisorName] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [supervisorLoading, setSupervisorLoading] = useState(false)
  const [workSchedule, setWorkSchedule] = useState<{
    work_start_time: string
    work_end_time: string
    lunch_break_start: string
    lunch_break_end: string
  } | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [leaveBalance, setLeaveBalance] = useState<any>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null)
  const [timeValidationError, setTimeValidationError] = useState<string | null>(null)

  // Asset issue request states
  const [assetRequestMode, setAssetRequestMode] = useState<'new' | 'issue'>('new')
  const [ownedItems, setOwnedItems] = useState<any[]>([])
  const [selectedInventoryItem, setSelectedInventoryItem] = useState('')
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const [issueQuantity, setIssueQuantity] = useState(1)
  const [issueImage, setIssueImage] = useState<File | null>(null)
  const [issueImagePreview, setIssueImagePreview] = useState<string | null>(null)
  const [uploadingIssueImage, setUploadingIssueImage] = useState(false)

  // Covering hours state
  const [coveringHours, setCoveringHours] = useState<number | null>(null)
  const [coveringHoursLoading, setCoveringHoursLoading] = useState(false)

  // Holiday validation state
  const [holidayDates, setHolidayDates] = useState<Date[]>([])
  const [holidayValidationError, setHolidayValidationError] = useState<string | null>(null)

  // Helper function to format days to "Xd Yh" format
  const formatDaysToHours = (days: number, workHoursPerDay: number = 9): string => {
    const fullDays = Math.floor(days)
    const remainingHours = (days - fullDays) * workHoursPerDay
    const hours = Math.round(remainingHours * 10) / 10 // Round to 1 decimal

    if (fullDays === 0 && hours > 0) {
      return `${hours}h`
    } else if (fullDays > 0 && hours > 0) {
      return `${fullDays}d ${hours}h`
    } else if (fullDays > 0) {
      return `${fullDays}d`
    } else {
      return '0h'
    }
  }

  // Check if dates are the same (for half-day leave)
  const isSameDay = startDate && endDate && startDate === endDate

  // Fetch department head for overtime requests
  useEffect(() => {
    if (requestType === 'overtime' && employeeId) {
      setSupervisorLoading(true)
      getDepartmentHeadForEmployee(employeeId)
        .then((result) => {
          if (result.supervisor) {
            setSupervisorName(result.supervisor.full_name)
            setSupervisorId(result.supervisor.id)
            setFormData((prev: any) => ({ ...prev, assigned_supervisor: result.supervisor.id }))
          } else if (result.message) {
            toast.info(result.message)
          }
        })
        .catch((error) => {
          toast.error('Failed to fetch supervisor: ' + error.message)
        })
        .finally(() => {
          setSupervisorLoading(false)
        })
    }
  }, [requestType, employeeId])

  // Fetch employee work schedule for leave requests
  useEffect(() => {
    if (requestType === 'leave' && employeeId) {
      setScheduleLoading(true)
      getEmployeePolicySchedule(employeeId)
        .then((result) => {
          if (result.schedule) {
            setWorkSchedule(result.schedule)
          } else if (result.message) {
            toast.info(result.message)
          }
        })
        .catch((error) => {
          console.error('Failed to fetch work schedule:', error)
          toast.error('Failed to fetch work schedule: ' + error.message)
        })
        .finally(() => {
          setScheduleLoading(false)
        })
    }
  }, [requestType, employeeId])

  // Fetch covering hours for covering requests
  useEffect(() => {
    if (requestType === 'covering' && employeeId) {
      setCoveringHoursLoading(true)
      getCoveringHours(employeeId)
        .then((hours) => {
          setCoveringHours(hours)
        })
        .catch((error) => {
          console.error('Failed to fetch covering hours:', error)
          toast.error('Failed to fetch covering hours: ' + error.message)
        })
        .finally(() => {
          setCoveringHoursLoading(false)
        })
    }
  }, [requestType, employeeId])

  // Fetch holidays for date validation
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const today = new Date()
        const futureDate = addMonths(today, 12) // Fetch holidays for next 12 months
        const holidays = await getHolidayDates(today, futureDate)

        // Store as Date array for DatePicker component
        setHolidayDates(holidays)
      } catch (error) {
        console.error('Failed to fetch holidays:', error)
        // Don't show error to user, just log it
      }
    }

    fetchHolidays()
  }, [])

  // Auto-populate start_time and end_time based on leave_duration
  useEffect(() => {
    if (requestType === 'leave' && workSchedule && formData.leave_duration && isSameDay) {
      let calculatedStartTime = ''
      let calculatedEndTime = ''

      switch (formData.leave_duration) {
        case 'full_day':
          calculatedStartTime = workSchedule.work_start_time
          calculatedEndTime = workSchedule.work_end_time
          break
        case 'half_day_morning':
          calculatedStartTime = workSchedule.work_start_time
          calculatedEndTime = workSchedule.lunch_break_start
          break
        case 'half_day_afternoon':
          calculatedStartTime = workSchedule.lunch_break_end
          calculatedEndTime = workSchedule.work_end_time
          break
        case 'custom_time':
          // Don't auto-populate for custom time
          calculatedStartTime = ''
          calculatedEndTime = ''
          break
      }

      setFormData((prev: any) => ({
        ...prev,
        start_time: calculatedStartTime,
        end_time: calculatedEndTime
      }))
    }
  }, [formData.leave_duration, workSchedule, requestType, isSameDay])

  // Fetch employee leave balance for leave requests
  useEffect(() => {
    if (requestType === 'leave' && employeeId) {
      setBalanceLoading(true)
      getEmployeeCurrentBalance(employeeId)
        .then((balance) => {
          if (balance) {
            setLeaveBalance(balance)
          }
        })
        .catch((error) => {
          console.error('Failed to fetch leave balance:', error)
        })
        .finally(() => {
          setBalanceLoading(false)
        })
    }
  }, [requestType, employeeId])

  // Calculate leave days in real-time
  useEffect(() => {
    if (requestType === 'leave' && workSchedule && startDate && endDate) {
      const workHoursPerDay = (() => {
        const [startHour, startMin] = workSchedule.work_start_time.split(':').map(Number)
        const [endHour, endMin] = workSchedule.work_end_time.split(':').map(Number)
        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin
        return (endMinutes - startMinutes) / 60
      })()

      if (isSameDay) {
        if (formData.leave_duration === 'full_day') {
          setCalculatedDays(1)
        } else if (formData.leave_duration === 'half_day_morning' || formData.leave_duration === 'half_day_afternoon') {
          setCalculatedDays(0.5)
        } else if (formData.leave_duration === 'custom_time' && formData.start_time && formData.end_time) {
          const [startHour, startMin] = formData.start_time.split(':').map(Number)
          const [endHour, endMin] = formData.end_time.split(':').map(Number)
          const leaveMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
          const leaveHours = leaveMinutes / 60
          const fractionalDays = Math.round((leaveHours / workHoursPerDay) * 100) / 100
          setCalculatedDays(fractionalDays)
        } else {
          setCalculatedDays(null)
        }
      } else {
        // Multi-day leave - simplified calculation
        const start = new Date(startDate)
        const end = new Date(endDate)
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        setCalculatedDays(daysDiff)
      }
    } else {
      setCalculatedDays(null)
    }
  }, [requestType, workSchedule, startDate, endDate, formData.leave_duration, formData.start_time, formData.end_time, isSameDay])

  // Validate that check-out time is before check-in time for leave and travel requests
  useEffect(() => {
    // Leave request validation
    if (requestType === 'leave' && formData.start_time && formData.end_time && isSameDay) {
      const [startHour, startMin] = formData.start_time.split(':').map(Number)
      const [endHour, endMin] = formData.end_time.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin

      if (startMinutes >= endMinutes) {
        setTimeValidationError('Check-out time must be before check-in time')
      } else {
        setTimeValidationError(null)
      }
    }
    // Travel request validation
    else if (requestType === 'travel' && formData.check_out_time && formData.check_in_time && startDate && endDate && startDate === endDate) {
      const [checkOutHour, checkOutMin] = formData.check_out_time.split(':').map(Number)
      const [checkInHour, checkInMin] = formData.check_in_time.split(':').map(Number)
      const checkOutMinutes = checkOutHour * 60 + checkOutMin
      const checkInMinutes = checkInHour * 60 + checkInMin

      if (checkOutMinutes >= checkInMinutes) {
        setTimeValidationError('Check-out time must be before check-in time')
      } else {
        setTimeValidationError(null)
      }
    }
    // Covering request validation
    else if (requestType === 'covering' && formData.start_time && formData.end_time) {
      const [startHour, startMin] = formData.start_time.split(':').map(Number)
      const [endHour, endMin] = formData.end_time.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin

      if (startMinutes >= endMinutes) {
        setTimeValidationError('Check-in time must be before check-out time')
      } else {
        setTimeValidationError(null)
      }
    } else {
      setTimeValidationError(null)
    }
  }, [requestType, formData.start_time, formData.end_time, formData.check_out_time, formData.check_in_time, isSameDay, startDate, endDate])

  // Load employee inventory for asset issue requests
  useEffect(() => {
    if (requestType === 'asset' && assetRequestMode === 'issue' && employeeId) {
      getEmployeeInventory(employeeId)
        .then((items) => {
          setOwnedItems(items)
        })
        .catch((error) => {
          console.error('Failed to load inventory:', error)
          toast.error('Failed to load your inventory items')
        })
    }
  }, [requestType, assetRequestMode, employeeId])

  const handleIssueImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB')
      return
    }

    setIssueImage(file)
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setIssueImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveIssueImage = () => {
    setIssueImage(null)
    setIssueImagePreview(null)
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    // Handle file inputs for expense attachments
    if (e.target instanceof HTMLInputElement && e.target.type === 'file' && e.target.name === 'attachments') {
      const files = e.target.files
      if (files && files.length > 0) {
        setLoading(true)
        try {
          // Upload all files to Supabase Storage
          const uploadPromises = Array.from(files).map(async (file) => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('employeeId', employeeId)

            const result = await uploadExpenseAttachment(formData)
            return result.url // Only return the URL string
          })

          const uploadedUrls = await Promise.all(uploadPromises)
          setFormData({ ...formData, attachments: uploadedUrls })
          toast.success(`${uploadedUrls.length} file(s) uploaded successfully!`)
        } catch (error: any) {
          toast.error(error.message || 'Failed to upload files')
        } finally {
          setLoading(false)
        }
      }
    } else if (e.target instanceof HTMLInputElement && e.target.type === 'file' && e.target.name === 'resignation_document') {
      // Handle file input for resignation document
      const file = e.target.files?.[0]
      if (file) {
        setLoading(true)
        try {
          const formDataToUpload = new FormData()
          formDataToUpload.append('file', file)
          formDataToUpload.append('employeeId', employeeId)

          const result = await uploadResignationDocument(formDataToUpload)
          setFormData({ ...formData, document_url: result.url })
          toast.success('Document uploaded successfully!')
        } catch (error: any) {
          toast.error(error.message || 'Failed to upload document')
        } finally {
          setLoading(false)
        }
      }
    } else {
      // Validate date inputs for holidays
      const dateFieldNames = ['start_date', 'end_date', 'date', 'expense_date', 'last_working_date', 'covering_date']

      if (dateFieldNames.includes(e.target.name) && e.target.value) {
        const selectedDate = e.target.value // Already in yyyy-MM-dd format

        // Check if selected date is a holiday
        const isHoliday = holidayDates.some(holidayDate =>
          formatDate(holidayDate, 'yyyy-MM-dd') === selectedDate
        )

        if (isHoliday) {
          setHolidayValidationError(`The selected date (${selectedDate}) is a holiday. Please choose a different date.`)
          // Still update the form data so user can see what they selected
          setFormData({ ...formData, [e.target.name]: e.target.value })
          return
        } else {
          // Clear holiday validation error if date is valid
          setHolidayValidationError(null)
        }
      }

      // Track date changes for leave requests
      if (e.target.name === 'start_date') {
        setStartDate(e.target.value)
      } else if (e.target.name === 'end_date') {
        setEndDate(e.target.value)
      }

      setFormData({ ...formData, [e.target.name]: e.target.value })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent submission if there are time validation errors
    if (timeValidationError) {
      toast.error(timeValidationError)
      return
    }

    // Prevent submission if there are holiday validation errors
    if (holidayValidationError) {
      toast.error(holidayValidationError)
      return
    }

    setLoading(true)

    try {
      let result
      switch (requestType) {
        case 'leave':
          result = await createLeaveRequest(employeeId, formData)
          break
        case 'overtime':
          result = await createOvertimeRequest(employeeId, {
            ...formData,
            hours: parseFloat(formData.hours),
          })
          break
        case 'travel':
          result = await createTravelRequest(employeeId, {
            ...formData,
            estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : undefined,
          })
          break
        case 'expense':
          result = await createExpenseRequest(employeeId, {
            ...formData,
            amount: parseFloat(formData.amount),
          })
          break
        case 'attendance_regularization':
          result = await createAttendanceRegularization(employeeId, formData)
          break
        case 'asset':
          if (assetRequestMode === 'new') {
            // New asset request
            result = await createAssetRequest(employeeId, {
              asset_type: formData.asset_type,
              quantity: parseInt(formData.quantity) || 1,
              reason: formData.reason,
              asset_specification: formData.asset_specification || undefined,
            })
          } else {
            // Asset issue request
            if (!selectedInventoryItem) {
              toast.error('Please select an item from your inventory')
              setLoading(false)
              return
            }

            if (!issueImage) {
              toast.error('Please upload an image showing the issue')
              setLoading(false)
              return
            }

            // Upload image first
            setUploadingIssueImage(true)
            try {
              const uploadFormData = new FormData()
              uploadFormData.append('file', issueImage)
              uploadFormData.append('employeeId', employeeId)

              const { url } = await uploadAssetIssueImage(uploadFormData)

              // Create issue request with image URL
              result = await createAssetIssueRequest(employeeId, {
                employee_inventory_id: selectedInventoryItem,
                issue_description: formData.issue_description,
                issue_image_url: url,
                issue_quantity: issueQuantity,
                requested_action: formData.requested_action || 'evaluate',
              })
            } catch (uploadError: any) {
              toast.error(uploadError.message || 'Failed to upload image')
              setLoading(false)
              setUploadingIssueImage(false)
              return
            } finally {
              setUploadingIssueImage(false)
            }
          }
          break
        case 'resignation':
          result = await createResignation(employeeId, formData)
          break
        case 'covering':
          result = await createCoveringRequest(employeeId, formData)
          break
        case 'request_for_covering':
          result = await createRequestForCovering(employeeId, formData)
          break
        default:
          throw new Error('Invalid request type')
      }

      toast.success('Request submitted successfully!')
      router.push('/requests')
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  const renderFormFields = () => {
    switch (requestType) {
      case 'leave':
        return (
          <>
            {/* Holiday Validation Error - Global */}
            {holidayValidationError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-xl border-2 border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {holidayValidationError}
                  </p>
                </div>
              </div>
            )}

            {/* Leave Balance Summary */}
            {leaveBalance && leaveBalance.policy && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Leave Balance Summary
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {leaveBalance.policy.name} • {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {calculatedDays !== null
                          ? formatDaysToHours(Number(leaveBalance.available_leaves) - calculatedDays, workSchedule ? (() => {
                            const [startHour, startMin] = workSchedule.work_start_time.split(':').map(Number)
                            const [endHour, endMin] = workSchedule.work_end_time.split(':').map(Number)
                            return ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60
                          })() : 9)
                          : formatDaysToHours(Number(leaveBalance.available_leaves), workSchedule ? (() => {
                            const [startHour, startMin] = workSchedule.work_start_time.split(':').map(Number)
                            const [endHour, endMin] = workSchedule.work_end_time.split(':').map(Number)
                            return ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60
                          })() : 9)
                        }
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        {calculatedDays !== null ? 'Available After' : 'Available'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">
                        {calculatedDays !== null
                          ? formatDaysToHours(Number(leaveBalance.used_leaves) + calculatedDays, workSchedule ? (() => {
                            const [startHour, startMin] = workSchedule.work_start_time.split(':').map(Number)
                            const [endHour, endMin] = workSchedule.work_end_time.split(':').map(Number)
                            return ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60
                          })() : 9)
                          : formatDaysToHours(Number(leaveBalance.used_leaves), workSchedule ? (() => {
                            const [startHour, startMin] = workSchedule.work_start_time.split(':').map(Number)
                            const [endHour, endMin] = workSchedule.work_end_time.split(':').map(Number)
                            return ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60
                          })() : 9)
                        }
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        {calculatedDays !== null ? 'Used After' : 'Used'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatDaysToHours(Number(leaveBalance.total_leaves), workSchedule ? (() => {
                          const [startHour, startMin] = workSchedule.work_start_time.split(':').map(Number)
                          const [endHour, endMin] = workSchedule.work_end_time.split(':').map(Number)
                          return ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60
                        })() : 9)}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total</div>
                    </div>
                  </div>
                </div>
                {calculatedDays !== null && (
                  <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
                      📊 Projected balance after requesting {formatDaysToHours(calculatedDays, workSchedule ? (() => {
                        const [startHour, startMin] = workSchedule.work_start_time.split(':').map(Number)
                        const [endHour, endMin] = workSchedule.work_end_time.split(':').map(Number)
                        return ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60
                      })() : 9)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {balanceLoading && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-center text-sm text-gray-600 dark:text-gray-400">
                Loading leave balance...
              </div>
            )}

            {!balanceLoading && !leaveBalance && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ No leave balance found. Please contact your administrator to assign a leave policy.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="leave_type">Leave Type *</Label>
              <select
                id="leave_type"
                name="leave_type"
                onChange={handleChange}
                required
                className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Select leave type</option>
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="vacation">Vacation</option>
                <option value="maternity">Maternity Leave</option>
                <option value="paternity">Paternity Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  min={formData.leave_type === 'sick' ? undefined : new Date().toISOString().split('T')[0]}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  min={formData.leave_type === 'sick' ? undefined : new Date().toISOString().split('T')[0]}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Leave Duration Selection - Show for same day or multi-day */}
            {(startDate && endDate) && (
              <>
                {isSameDay ? (
                  <div className="space-y-2">
                    <Label htmlFor="leave_duration">Leave Duration *</Label>
                    <select
                      id="leave_duration"
                      name="leave_duration"
                      onChange={handleChange}
                      required
                      className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      <option value="">Select duration</option>
                      <option value="full_day">Full Day</option>
                      <option value="half_day_morning">Half Day - Morning</option>
                      <option value="half_day_afternoon">Half Day - Afternoon</option>
                      <option value="custom_time">Custom Time Range</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      {formData.leave_duration === 'full_day' && 'Full working day leave'}
                      {formData.leave_duration === 'half_day_morning' && 'Leave for the morning session'}
                      {formData.leave_duration === 'half_day_afternoon' && 'Leave for the afternoon session'}
                      {formData.leave_duration === 'custom_time' && 'Specify custom start and end time'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Multi-day leave:</strong> Optionally specify times for the first and last day below.
                    </p>
                  </div>
                )}

                {/* Show time inputs for custom time or multi-day leaves */}
                {((isSameDay && formData.leave_duration === 'custom_time') || !isSameDay) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">
                        {isSameDay ? 'Check-Out Time *' : 'Check-Out Time (Optional)'}
                      </Label>
                      <Input
                        id="start_time"
                        name="start_time"
                        type="time"
                        value={formData.start_time || ''}
                        onChange={handleChange}
                        required={!!(isSameDay && formData.leave_duration === 'custom_time')}
                        readOnly={!!(isSameDay && formData.leave_duration && formData.leave_duration !== 'custom_time')}
                        className={isSameDay && formData.leave_duration && formData.leave_duration !== 'custom_time' ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}
                      />
                      <p className="text-xs text-gray-500">
                        {isSameDay ? 'Leave start time' : 'Time on first day (if partial)'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">
                        {isSameDay ? 'Check-In Time *' : 'Check-In Time (Optional)'}
                      </Label>
                      <Input
                        id="end_time"
                        name="end_time"
                        type="time"
                        value={formData.end_time || ''}
                        onChange={handleChange}
                        required={!!(isSameDay && formData.leave_duration === 'custom_time')}
                        readOnly={!!(isSameDay && formData.leave_duration && formData.leave_duration !== 'custom_time')}
                        className={isSameDay && formData.leave_duration && formData.leave_duration !== 'custom_time' ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}
                      />
                      <p className="text-xs text-gray-500">
                        {isSameDay ? 'Leave end time' : 'Time on last day (if partial)'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Time Validation Error */}
                {timeValidationError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ⚠️ {timeValidationError}
                    </p>
                  </div>
                )}

                {/* Show calculated leave days */}
                {calculatedDays !== null && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400 text-lg">ℹ️</span>
                      <div>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                          This leave request is for {formatDaysToHours(calculatedDays, workSchedule ? (() => {
                            const [startHour, startMin] = workSchedule.work_start_time.split(':').map(Number)
                            const [endHour, endMin] = workSchedule.work_end_time.split(':').map(Number)
                            return ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60
                          })() : 9)}
                        </p>
                        {isSameDay && formData.leave_duration === 'custom_time' && workSchedule && formData.start_time && formData.end_time && (
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {(() => {
                              const [startHour, startMin] = formData.start_time.split(':').map(Number)
                              const [endHour, endMin] = formData.end_time.split(':').map(Number)
                              const leaveMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
                              const leaveHours = leaveMinutes / 60
                              const [wStartHour, wStartMin] = workSchedule.work_start_time.split(':').map(Number)
                              const [wEndHour, wEndMin] = workSchedule.work_end_time.split(':').map(Number)
                              const workMinutes = (wEndHour * 60 + wEndMin) - (wStartHour * 60 + wStartMin)
                              const workHours = workMinutes / 60
                              return `${leaveHours.toFixed(1)} hours out of ${workHours.toFixed(1)} hours per day`
                            })()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <textarea
                id="reason"
                name="reason"
                onChange={handleChange}
                required
                rows={4}
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Explain the reason for your leave request..."
              />
            </div>
          </>
        )

      case 'overtime':
        return (
          <>
            {/* Holiday Validation Error */}
            {holidayValidationError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-xl border-2 border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {holidayValidationError}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Hours *</Label>
                <Input
                  id="hours"
                  name="hours"
                  type="number"
                  step="0.5"
                  onChange={handleChange}
                  required
                  placeholder="2.5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_supervisor">Assigned Supervisor *</Label>
              <Input
                id="assigned_supervisor"
                name="assigned_supervisor"
                value={supervisorName}
                readOnly
                disabled={supervisorLoading}
                required
                placeholder={supervisorLoading ? "Loading supervisor..." : "Auto-assigned based on department"}
                className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
              />
              {supervisorName && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ Department head auto-assigned
                </p>
              )}
              {!supervisorName && !supervisorLoading && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  ⚠ No department head assigned. Please contact admin.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <textarea
                id="reason"
                name="reason"
                onChange={handleChange}
                required
                rows={4}
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Explain the reason for overtime..."
              />
            </div>
          </>
        )

      case 'travel':
        return (
          <>
            {/* Holiday Validation Error */}
            {holidayValidationError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-xl border-2 border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {holidayValidationError}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  name="destination"
                  onChange={handleChange}
                  required
                  placeholder="New York, USA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">Estimated Cost *</Label>
                <Input
                  id="estimated_cost"
                  name="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999999.99"
                  onChange={handleChange}
                  required
                  placeholder="1500.00"
                />
                <p className="text-xs text-gray-500">
                  Maximum: $99,999,999.99
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_out_time">Check-Out Time *</Label>
                <Input
                  id="check_out_time"
                  name="check_out_time"
                  type="time"
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-gray-500">
                  Departure time on start date
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_in_time">Check-In Time *</Label>
                <Input
                  id="check_in_time"
                  name="check_in_time"
                  type="time"
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-gray-500">
                  Return/arrival time on end date
                </p>
              </div>
            </div>

            {/* Time Validation Error */}
            {timeValidationError && requestType === 'travel' && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  ⚠️ {timeValidationError}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <textarea
                id="purpose"
                name="purpose"
                onChange={handleChange}
                required
                rows={4}
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Describe the purpose of travel..."
              />
            </div>
          </>
        )

      case 'expense':
        return (
          <>
            {/* Holiday Validation Error */}
            {holidayValidationError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-xl border-2 border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {holidayValidationError}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense_type">Expense Type *</Label>
                <Input
                  id="expense_type"
                  name="expense_type"
                  onChange={handleChange}
                  required
                  placeholder="Travel, Food, Equipment, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  onChange={handleChange}
                  required
                  placeholder="150.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date">Expense Date *</Label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                name="description"
                onChange={handleChange}
                required
                rows={4}
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Describe the expense..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments (Receipt/Invoice)</Label>
              <Input
                id="attachments"
                name="attachments"
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload receipts, invoices, or supporting documents (Images or PDF, max 10MB each)
              </p>
              {formData.attachments && formData.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">
                    Uploaded Files:
                  </p>
                  <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside">
                    {formData.attachments.map((url: string, index: number) => (
                      <li key={index}>{url.split('/').pop()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )

      case 'attendance_regularization':
        return (
          <>
            {/* Holiday Validation Error */}
            {holidayValidationError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-xl border-2 border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {holidayValidationError}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actual_time">Actual Time</Label>
                <Input
                  id="actual_time"
                  name="actual_time"
                  type="time"
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requested_time">Requested Time *</Label>
                <Input
                  id="requested_time"
                  name="requested_time"
                  type="time"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <textarea
                id="reason"
                name="reason"
                onChange={handleChange}
                required
                rows={4}
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Explain why attendance needs correction..."
              />
            </div>
          </>
        )

      case 'asset':
        return (
          <>
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button
                type="button"
                onClick={() => setAssetRequestMode('new')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${assetRequestMode === 'new'
                  ? 'bg-white dark:bg-gray-900 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                Request New Asset
              </button>
              <button
                type="button"
                onClick={() => setAssetRequestMode('issue')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${assetRequestMode === 'issue'
                  ? 'bg-white dark:bg-gray-900 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                Report Asset Issue
              </button>
            </div>

            {assetRequestMode === 'new' ? (
              /* New Asset Request Section */
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset_type">Asset Type *</Label>
                    <Input
                      id="asset_type"
                      name="asset_type"
                      onChange={handleChange}
                      required
                      placeholder="Laptop, Monitor, Phone, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      onChange={handleChange}
                      required
                      defaultValue="1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset_specification">Asset Specification</Label>
                  <textarea
                    id="asset_specification"
                    name="asset_specification"
                    onChange={handleChange}
                    rows={3}
                    className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    placeholder="Specify details like model, RAM, storage, etc..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <textarea
                    id="reason"
                    name="reason"
                    onChange={handleChange}
                    required
                    rows={4}
                    className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    placeholder="Explain why you need this asset..."
                  />
                </div>
              </>
            ) : (
              /* Asset Issue Report Section */
              <>
                <div className="space-y-2">
                  <Label htmlFor="selected_inventory_item">Select Your Item *</Label>

                  {/* Search Filter */}
                  {/* <Input
                    type="text"
                    placeholder="Search inventory items..."
                    value={inventorySearchTerm}
                    onChange={(e) => setInventorySearchTerm(e.target.value)}
                    className="mb-2"
                  /> */}

                  <select
                    id="selected_inventory_item"
                    value={selectedInventoryItem}
                    onChange={(e) => {
                      setSelectedInventoryItem(e.target.value)
                      // Reset quantity when item changes
                      const selected = ownedItems.find(item => item.id === e.target.value)
                      setIssueQuantity(selected?.quantity_assigned > 1 ? 1 : 1)
                    }}
                    required
                    className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="">Select an item from your inventory</option>
                    {ownedItems
                      .filter(item =>
                        inventorySearchTerm === '' ||
                        item.item_name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                        (item.serial_number && item.serial_number.toLowerCase().includes(inventorySearchTerm.toLowerCase()))
                      )

                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.item_name} {item.serial_number ? `(SN: ${item.serial_number})` : ''} - Qty: {item.quantity_assigned || 1}
                        </option>
                      ))}
                  </select>
                  {ownedItems.length === 0 && (
                    <p className="text-xs text-gray-500">No inventory items found. You must have assigned items to report issues.</p>
                  )}
                  {inventorySearchTerm && ownedItems.filter(item =>
                    item.item_name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                    (item.serial_number && item.serial_number.toLowerCase().includes(inventorySearchTerm.toLowerCase()))
                  ).length === 0 && (
                      <p className="text-xs text-orange-500">No items match your search.</p>
                    )}
                </div>

                {/* Conditional Quantity Input */}
                {selectedInventoryItem && ownedItems.find(item => item.id === selectedInventoryItem)?.quantity_assigned > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="issue_quantity">How many units have this issue? *</Label>
                    <Input
                      id="issue_quantity"
                      type="number"
                      min="1"
                      max={ownedItems.find(item => item.id === selectedInventoryItem)?.quantity_assigned || 1}
                      value={issueQuantity}
                      onChange={(e) => setIssueQuantity(parseInt(e.target.value) || 1)}
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Total assigned: {ownedItems.find(item => item.id === selectedInventoryItem)?.quantity_assigned || 1} units
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="issue_description">Issue Description *</Label>
                  <textarea
                    id="issue_description"
                    name="issue_description"
                    onChange={handleChange}
                    required
                    rows={4}
                    className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    placeholder="Describe the issue with the item..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Upload Issue Photo *</Label>
                  {issueImagePreview ? (
                    <div className="relative">
                      <img
                        src={issueImagePreview}
                        alt="Issue preview"
                        className="w-full h-48 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveIssueImage}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center
                      hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('issue_image_input')?.click()}
                    >
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload photo showing the issue
                      </p>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max 10MB)</p>
                    </div>
                  )}
                  <input
                    id="issue_image_input"
                    type="file"
                    accept="image/*"
                    onChange={handleIssueImageChange}
                    className="hidden"
                    required={!issueImage}
                  />
                </div>
              </>
            )}
          </>
        )

      case 'resignation':
        return (
          <>
            {/* Holiday Validation Error */}
            {holidayValidationError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-xl border-2 border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {holidayValidationError}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="last_working_date">Last Working Date *</Label>
              <Input
                id="last_working_date"
                name="last_working_date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Resignation *</Label>
              <textarea
                id="reason"
                name="reason"
                onChange={handleChange}
                required
                rows={4}
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Please provide your reason for resignation..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <textarea
                id="feedback"
                name="feedback"
                onChange={handleChange}
                rows={4}
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Any feedback about your experience..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resignation_document">Resignation Document (Optional)</Label>
              <Input
                id="resignation_document"
                name="resignation_document"
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload your resignation letter or related document (PDF, DOC, DOCX, or Image, max 10MB)
              </p>
              {formData.document_url && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">
                    Document Uploaded Successfully
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {formData.document_url.split('/').pop()}
                  </p>
                </div>
              )}
            </div>
          </>
        )

      case 'covering':
        return (
          <>
            {/* Holiday Validation Error */}
            {holidayValidationError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-xl border-2 border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {holidayValidationError}
                  </p>
                </div>
              </div>
            )}

            {/* Covering Hours Balance Display */}
            {coveringHoursLoading ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading covering hours...</p>
              </div>
            ) : coveringHours !== null && coveringHours > 0 ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Your Covering Hours Balance
                    </h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Hours you need to cover
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {coveringHours.toFixed(1)}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-500">hours</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-xl border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                  <div>
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
                      No Covering Hours Required
                    </h4>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      You don't have any covering hours to complete at the moment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="covering_date">Covering Date *</Label>
              <Input
                id="covering_date"
                name="covering_date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Check-in Time *</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Check-out Time *</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Time Validation Error */}
            {timeValidationError && requestType === 'covering' && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  ⚠️ {timeValidationError}
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ <strong>Note:</strong> Work description and proof will be added later in the approval workflow.
              </p>
            </div>
          </>
        )

      case 'request_for_covering':
        return (
          <>
            {/* Holiday Validation Error */}
            {holidayValidationError && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-xl border-2 border-red-200 dark:border-red-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {holidayValidationError}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <textarea
                id="reason"
                name="reason"
                onChange={handleChange}
                required
                rows={4}
                className="flex w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Explain why you want to do covering for this time period..."
              />
            </div>
          </>
        )

      default:
        return <p>Invalid request type</p>
    }
  }

  const getRequestTitle = () => {
    const titles: Record<string, string> = {
      leave: 'Leave Request',
      overtime: 'Overtime Request',
      travel: 'Travel Request',
      expense: 'Expense Reimbursement',
      attendance_regularization: 'Attendance Regularization',
      asset: 'Asset Request',
      resignation: 'Resignation',
      covering: 'Covering Request',
      request_for_covering: 'Request for Covering',
    }
    return titles[requestType] || 'Request'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getRequestTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderFormFields()}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
