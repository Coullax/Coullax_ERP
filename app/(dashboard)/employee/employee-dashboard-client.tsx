'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  LogIn,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { LeaveSection } from '@/components/employee/leave-section'
import { DashboardCalendar } from '@/components/employee/dashboard-calendar'
import { getCalendarEvents, getUserCalendars } from '@/app/(dashboard)/calendar/actions'
import type { CalendarEventWithDetails } from '@/lib/types/calendar'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface EmployeeDashboardClientProps {
  profile: any
  employee: any
  todayAttendance: any
  attendanceStats: any
  recentRequests: any[]
}

export function EmployeeDashboardClient({
  profile,
  employee,
  todayAttendance,
  attendanceStats,
  recentRequests,
}: EmployeeDashboardClientProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventWithDetails[]>([])
  const [calendarLoading, setCalendarLoading] = useState(true)

  useEffect(() => {
    const loadCalendarEvents = async () => {
      try {
        setCalendarLoading(true)
        const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd")
        const endDate = format(endOfMonth(new Date()), "yyyy-MM-dd")
        
        // Get user's calendars and filter for personal calendars only
        const calendars = await getUserCalendars()
        const personalCalendarIds = calendars
          .filter(cal => cal.type === 'personal' && cal.owner_id === profile.id)
          .map(cal => cal.id)
        
        // Fetch events only from personal calendars to avoid showing other employees' events
        const events = personalCalendarIds.length > 0
          ? await getCalendarEvents(startDate, endDate, personalCalendarIds)
          : []
        
        setCalendarEvents(events)
      } catch (error) {
        console.error('Failed to load calendar events:', error)
        setCalendarEvents([])
      } finally {
        setCalendarLoading(false)
      }
    }

    loadCalendarEvents()
  }, [profile.id])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      approved: { variant: 'success', icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
      cancelled: { variant: 'outline', icon: XCircle, label: 'Cancelled' },
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
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-gray-500 mt-1">Here&apos;s your overview for today</p>
        </div>
        <div className="flex gap-2">
          <Link href="/attendance">
            <Button variant="outline">
              <LogIn className="w-4 h-4 mr-2" />
              Mark Attendance
            </Button>
          </Link>
          <Link href="/requests/new/leave">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Today's Status */}
      <Card className="bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-black">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Today&apos;s Attendance</h2>
              {todayAttendance ? (
                <div className="space-y-1">
                  <p className="text-sm opacity-80">
                    Checked in at {new Date(`${todayAttendance.date}T${todayAttendance.check_in}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {todayAttendance.check_out && (
                    <p className="text-sm opacity-80">
                      Checked out at {new Date(`${todayAttendance.date}T${todayAttendance.check_out}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm opacity-80">Not marked yet</p>
              )}
            </div>
            <Calendar className="w-12 h-12 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Monthly Stats & Leave Balance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Present Days</p>
                <p className="text-3xl font-bold">{attendanceStats.present}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">On Leave</p>
                <p className="text-3xl font-bold">{attendanceStats.leave}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Absent</p>
                <p className="text-3xl font-bold">{attendanceStats.absent}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/profile">
              <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer">
                <User className="w-6 h-6 mb-2 text-blue-500" />
                <p className="font-medium text-sm">My Profile</p>
              </div>
            </Link>
            <Link href="/attendance">
              <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer">
                <Calendar className="w-6 h-6 mb-2 text-green-500" />
                <p className="font-medium text-sm">Attendance</p>
              </div>
            </Link>
            <Link href="/requests">
              <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer">
                <FileText className="w-6 h-6 mb-2 text-purple-500" />
                <p className="font-medium text-sm">Requests</p>
              </div>
            </Link>
            <Link href="/verification">
              <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer">
                <CheckCircle className="w-6 h-6 mb-2 text-yellow-500" />
                <p className="font-medium text-sm">Verification</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Leave Balance & Calendar - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Leave Balance & History */}
        <LeaveSection employeeId={employee.id} />

        {/* Right: Events Calendar */}
        <DashboardCalendar events={calendarEvents} loading={calendarLoading} />
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Requests</CardTitle>
          <Link href="/requests">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-gray-800"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {request.request_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(request.submitted_at)}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
