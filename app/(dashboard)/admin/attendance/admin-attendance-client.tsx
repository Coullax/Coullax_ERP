'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  UserX,
  Clock,
  LogIn,
  LogOut,
  Coffee,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { cn } from '@/lib/utils'
import {
  getAttendanceSummaryByDate,
  getEmployeesAttendanceByDate,
  getEmployeesOnLeaveByDate,
  getMonthAttendanceData,
} from '@/app/actions/admin-attendance-actions'
import { formatTime } from '@/lib/utils'
import { toast } from 'sonner'

interface AttendanceRecord {
  id: string
  employee: {
    id: string
    employee_id: string
    full_name: string
  }
  check_in: string | null
  check_out: string | null
  status: string
  notes?: string
  date: string
}

interface LeaveRecord {
  id: string
  employee: {
    id: string
    employee_id: string
    full_name: string
  }
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  request_id: string
}

interface AdminAttendanceClientProps {
  initialAttendanceData: AttendanceRecord[]
  initialLeaveData: LeaveRecord[]
  initialSummary: {
    totalAttendance: number
    totalLeaves: number
  }
  initialMonthData: {
    attendanceByDate: Record<string, number>
    leavesByDate: Record<string, number>
  }
}

export function AdminAttendanceClient({
  initialAttendanceData,
  initialLeaveData,
  initialSummary,
  initialMonthData,
}: AdminAttendanceClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>(initialAttendanceData)
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>(initialLeaveData)
  const [summary, setSummary] = useState(initialSummary)
  const [monthData, setMonthData] = useState(initialMonthData)
  const [loading, setLoading] = useState(false)

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Fetch data when date is selected
  const handleDateClick = async (date: Date) => {
    setSelectedDate(date)
    setLoading(true)

    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const [summaryData, attendance, leaves] = await Promise.all([
        getAttendanceSummaryByDate(dateStr),
        getEmployeesAttendanceByDate(dateStr),
        getEmployeesOnLeaveByDate(dateStr),
      ])

      setSummary(summaryData)
      setAttendanceData(attendance)
      setLeaveData(leaves)
    } catch (error) {
      console.error('Error fetching attendance data:', error)
      toast.error('Failed to fetch attendance data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch month data when month changes
  useEffect(() => {
    const fetchMonthData = async () => {
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const data = await getMonthAttendanceData(year, month)
        setMonthData(data)
      } catch (error) {
        console.error('Error fetching month data:', error)
      }
    }

    fetchMonthData()
  }, [currentMonth])

  const previousMonth = () => setCurrentMonth(prev => subMonths(prev, 1))
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))
  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    handleDateClick(today)
  }

  const getLeaveTypeBadge = (type: string) => {
    const variants: Record<string, { variant: any; color: string }> = {
      sick: { variant: 'destructive', color: 'text-red-600' },
      casual: { variant: 'secondary', color: 'text-blue-600' },
      vacation: { variant: 'default', color: 'text-green-600' },
      maternity: { variant: 'secondary', color: 'text-purple-600' },
      paternity: { variant: 'secondary', color: 'text-purple-600' },
      unpaid: { variant: 'outline', color: 'text-gray-600' },
    }
    const config = variants[type] || { variant: 'secondary', color: 'text-gray-600' }
    return (
      <Badge variant={config.variant} className="capitalize">
        {type.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <p className="text-gray-500 mt-1">
          View and manage employee attendance and leave records
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Attendance</p>
                <p className="text-3xl font-bold mt-2">{summary.totalAttendance}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Leaves</p>
                <p className="text-3xl font-bold mt-2">{summary.totalLeaves}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Coffee className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Calendar and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const attendanceCount = monthData.attendanceByDate[dateKey] || 0
                  const leavesCount = monthData.leavesByDate[dateKey] || 0
                  const isToday = isSameDay(day, new Date())
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isSelected = isSameDay(day, selectedDate)

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        'min-h-20 p-2 rounded-lg border-2 cursor-pointer hover:border-blue-300 transition-all',
                        !isCurrentMonth && 'opacity-40',
                        isSelected && 'border-blue-500 bg-blue-50 dark:bg-blue-950',
                        !isSelected && 'border-gray-200 dark:border-gray-800'
                      )}
                    >
                      <div
                        className={cn(
                          'text-sm font-medium mb-1',
                          isToday &&
                            'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center'
                        )}
                      >
                        {format(day, 'd')}
                      </div>

                      {/* Attendance/Leave Indicators */}
                      {isCurrentMonth && (attendanceCount > 0 || leavesCount > 0) && (
                        <div className="space-y-1 mt-1">
                          {attendanceCount > 0 && (
                            <div className="text-xs px-1 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{attendanceCount}</span>
                            </div>
                          )}
                          {leavesCount > 0 && (
                            <div className="text-xs px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              <Coffee className="h-3 w-3" />
                              <span>{leavesCount}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">
                {format(selectedDate, 'EEEE, MMM d')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading...</p>
                </div>
              ) : (
                <>
                  {/* Employees Present */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Employees Present ({attendanceData.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {attendanceData.length > 0 ? (
                        attendanceData.map(record => (
                          <div
                            key={record.id}
                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-sm">
                                  {record.employee.full_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {record.employee.employee_id}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {record.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                              {record.check_in && (
                                <span className="flex items-center gap-1">
                                  <LogIn className="h-3 w-3" />
                                  {formatTime(record.check_in)}
                                </span>
                              )}
                              {record.check_out && (
                                <span className="flex items-center gap-1">
                                  <LogOut className="h-3 w-3" />
                                  {formatTime(record.check_out)}
                                </span>
                              )}
                            </div>
                            {record.notes && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                {record.notes}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-gray-400">
                          <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No attendance records</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Employees on Leave */}
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      Employees on Leave ({leaveData.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {leaveData.length > 0 ? (
                        leaveData.map(leave => (
                          <div
                            key={leave.id}
                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-sm">
                                  {leave.employee.full_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {leave.employee.employee_id}
                                </p>
                              </div>
                              {getLeaveTypeBadge(leave.leave_type)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                              <p>
                                {format(new Date(leave.start_date), 'MMM d')} -{' '}
                                {format(new Date(leave.end_date), 'MMM d, yyyy')}
                              </p>
                              <p className="mt-1">
                                {leave.total_days} {leave.total_days === 1 ? 'day' : 'days'}
                              </p>
                            </div>
                            {leave.reason && (
                              <p className="text-xs text-gray-500 mt-2 italic line-clamp-2">
                                {leave.reason}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-gray-400">
                          <Coffee className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No leaves</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
