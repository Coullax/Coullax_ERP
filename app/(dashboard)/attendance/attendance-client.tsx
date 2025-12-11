'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { AttendanceCalendar } from '@/components/attendance-calendar'


interface AttendancePageClientProps {
  userId: string
  logs: any[]
  summary: any
}

export function AttendancePageClient({
  userId,
  logs,
  summary,
}: AttendancePageClientProps) {
  const [loading, setLoading] = useState(false)

  const todayLog = logs.find(
    (log) => log.date === new Date().toISOString().split('T')[0]
  )

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
      <Card className="bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-black">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">
                {todayLog?.check_in && !todayLog?.check_out
                  ? 'You are checked in'
                  : todayLog?.check_out
                    ? 'Attendance marked for today'
                    : 'Mark your attendance'}
              </h2>
              {todayLog?.check_in && (
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
              {!todayLog?.check_in ? (
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
              <p className="text-2xl font-bold">{summary.total}</p>
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

      {/* Attendance Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <AttendanceCalendar logs={logs} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
