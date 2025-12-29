'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { markAttendance } from '@/app/actions/attendance-actions'
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle,
  XCircle,
  Coffee,
  PartyPopper,
} from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { AttendanceCalendar } from '@/components/attendance-calendar'
import { isHoliday, getHolidayName } from '@/lib/holiday-utils'


interface AttendancePageClientProps {
  userId: string
  logs: any[]
  summary: any
  leaves: any[]
}

export function AttendancePageClient({
  userId,
  logs,
  summary,
  leaves,
}: AttendancePageClientProps) {
  const [loading, setLoading] = useState(false)
  const [isTodayHoliday, setIsTodayHoliday] = useState(false)
  const [holidayName, setHolidayName] = useState<string | null>(null)

  const todayLog = logs.find(
    (log) => log.date === new Date().toISOString().split('T')[0]
  )

  // Check if today is a holiday
  useEffect(() => {
    const checkTodayHoliday = async () => {
      const today = new Date()
      const isHol = await isHoliday(today)
      setIsTodayHoliday(isHol)

      if (isHol) {
        const name = await getHolidayName(today)
        setHolidayName(name)
      }
    }

    checkTodayHoliday()
  }, [])

  // Calculate working hours in minutes
  const calculateWorkingMinutes = (checkIn: string, checkOut: string) => {
    const [inHours, inMinutes] = checkIn.split(':').map(Number)
    const [outHours, outMinutes] = checkOut.split(':').map(Number)
    const inTotalMinutes = inHours * 60 + inMinutes
    const outTotalMinutes = outHours * 60 + outMinutes
    return outTotalMinutes - inTotalMinutes
  }

  // Get the start and end of current week (Sunday to Saturday)
  const getWeekRange = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    return { start: startOfWeek, end: endOfWeek }
  }

  // Get the start and end of current month
  const getMonthRange = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)
    return { start: startOfMonth, end: endOfMonth }
  }

  // Calculate total working hours for a date range
  const calculateTotalHours = (startDate: Date, endDate: Date) => {
    const filteredLogs = logs.filter((log) => {
      const logDate = new Date(log.date)
      return logDate >= startDate && logDate <= endDate && log.check_in && log.check_out
    })

    const totalMinutes = filteredLogs.reduce((acc, log) => {
      if (log.check_in && log.check_out) {
        return acc + calculateWorkingMinutes(log.check_in, log.check_out)
      }
      return acc
    }, 0)

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return { hours, minutes, totalMinutes, count: filteredLogs.length }
  }

  // Calculate weekly and monthly stats
  const weekRange = getWeekRange()
  const monthRange = getMonthRange()
  const weeklyStats = calculateTotalHours(weekRange.start, weekRange.end)
  const monthlyStats = calculateTotalHours(monthRange.start, monthRange.end)

  // Get current day of the month (e.g., if today is 22nd, totalDays = 22)
  const totalDays = new Date().getDate()

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      await markAttendance(userId, 'check_in')
      toast.success('Checked in successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to check in')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setLoading(true)
    try {
      await markAttendance(userId, 'check_out')
      toast.success('Checked out successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to check out')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      present: { variant: 'success', icon: CheckCircle, label: 'Present' },
      absent: { variant: 'destructive', icon: XCircle, label: 'Absent' },
      leave: { variant: 'secondary', icon: Coffee, label: 'Leave' },
      half_day: { variant: 'outline', icon: Clock, label: 'Half Day' },
    }
    const config = variants[status] || { variant: 'secondary', icon: Clock, label: status }
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-gray-500 mt-1">Track your attendance and view history</p>
      </div>

      {/* Check In/Out Card */}
      <Card className={isTodayHoliday
        ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
        : "bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-black"
      }>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">
                {isTodayHoliday ? (
                  <>🎉 {holidayName || 'Holiday'}</>
                ) : todayLog?.check_in && !todayLog?.check_out ? (
                  'You are checked in'
                ) : todayLog?.check_out ? (
                  'Attendance marked for today'
                ) : (
                  'Mark your attendance'
                )}
              </h2>
              {isTodayHoliday ? (
                <p className="text-sm opacity-90 mt-2">
                  Today is a holiday. Attendance marking is disabled.
                </p>
              ) : todayLog?.check_in && (
                <div className="flex flex-col gap-2 mt-4">
                  <div className="flex items-center gap-2">
                    <LogIn className="w-5 h-5" />
                    <span>Check In: {formatTime(todayLog.check_in)}</span>
                  </div>
                  {todayLog.check_out && (
                    <div className="flex items-center gap-2">
                      <LogOut className="w-5 h-5" />
                      <span>Check Out: {formatTime(todayLog.check_out)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {isTodayHoliday ? (
                <div className="text-center">
                  <PartyPopper className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm opacity-90">Enjoy your holiday!</p>
                </div>
              ) : !todayLog?.check_in ? (
                <Button
                  onClick={handleCheckIn}
                  disabled={loading}
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-900"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Check In
                </Button>
              ) : !todayLog?.check_out ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={loading}
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-900"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Check Out
                </Button>
              ) : (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm opacity-80">All done for today!</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Total Days</p>
              <p className="text-2xl font-bold">{totalDays}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-gray-500">Present</p>
              <p className="text-2xl font-bold">{summary.present}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm text-gray-500">Absent</p>
              <p className="text-2xl font-bold">{summary.absent}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Coffee className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-gray-500">Leave</p>
              <p className="text-2xl font-bold">{summary.leave}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-sm text-gray-500">Half Day</p>
              <p className="text-2xl font-bold">{summary.halfDay}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Working Hours Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-2 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">This Week</h3>
                </div>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {weeklyStats.hours}h {weeklyStats.minutes}m
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  {weeklyStats.count} {weeklyStats.count === 1 ? 'day' : 'days'} worked
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-200 dark:bg-purple-800 rounded-full p-4">
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{weeklyStats.count}</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">This Month</h3>
                </div>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {monthlyStats.hours}h {monthlyStats.minutes}m
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {monthlyStats.count} {monthlyStats.count === 1 ? 'day' : 'days'} worked
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-200 dark:bg-blue-800 rounded-full p-4">
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{monthlyStats.count}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceCalendar logs={logs} leaves={leaves} />
        </CardContent>
      </Card>
    </div>
  )
}
