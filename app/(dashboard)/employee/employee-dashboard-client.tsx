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
  Upload,
  CreditCard,
  Plane,
  FileQuestion,
  LogOut,
  Bell
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { LeaveSection } from '@/components/employee/leave-section'
import { DashboardCalendar } from '@/components/employee/dashboard-calendar'
import { AnnouncementSection } from '@/components/employee/announcement-section'
import { getCalendarEvents, getUserCalendars } from '@/app/(dashboard)/calendar/actions'
import type { CalendarEventWithDetails } from '@/lib/types/calendar'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface EmployeeDashboardClientProps {
  profile: any
  employee: any
  todayAttendance: any
  attendanceStats: any
  recentRequests: any[]
  hasAwaitingProofSubmission: boolean
}

export function EmployeeDashboardClient({
  profile,
  employee,
  todayAttendance,
  attendanceStats,
  recentRequests,
  hasAwaitingProofSubmission,
}: EmployeeDashboardClientProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventWithDetails[]>([])
  const [calendarLoading, setCalendarLoading] = useState(true)

  useEffect(() => {
    const loadCalendarEvents = async () => {
      try {
        setCalendarLoading(true)
        const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd")
        const endDate = format(endOfMonth(new Date()), "yyyy-MM-dd")

        const calendars = await getUserCalendars()
        const personalCalendarIds = calendars
          .filter(cal => cal.type === 'personal' && cal.owner_id === profile.id)
          .map(cal => cal.id)

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

  // --- Helpers ---

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium',
      approved: 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium',
      rejected: 'bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium',
      cancelled: 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium',
      admin_approval_pending: 'bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium',
      team_leader_approval_pending: 'bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium',
      admin_final_approval_pending: 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium',
      proof_verification_pending: 'bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium',
      awaiting_proof_submission: 'bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-medium',
    }
    const className = variants[status] || 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium'
    const label = status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    return <span className={className}>{label}</span>
  }

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'leave': return <Calendar className="w-5 h-5 text-blue-500" />
      case 'expense': return <CreditCard className="w-5 h-5 text-purple-500" />
      case 'travel': return <Plane className="w-5 h-5 text-orange-500" />
      case 'document': return <FileText className="w-5 h-5 text-green-500" />
      default: return <FileQuestion className="w-5 h-5 text-gray-500" />
    }
  }

  // --- Render ---

  return (
    <div className="flex flex-col gap-8 pb-8">

      {/* 1. Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/requests/new/leave">
            <Button size="lg" className="shadow-lg shadow-primary/20 transition-all hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Attendance Card */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              {todayAttendance ? (
                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Present</Badge>
              ) : (
                <Badge variant="outline" className="border-gray-200 text-gray-500">Not Marked</Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Today's Attendance</p>
              {todayAttendance ? (
                <div className="mt-1">
                  <p className="text-2xl font-bold tracking-tight">
                    {new Date(`${todayAttendance.date}T${todayAttendance.check_in}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {todayAttendance.check_out && (
                    <p className="text-xs text-gray-500 mt-1">
                      Out: {new Date(`${todayAttendance.date}T${todayAttendance.check_out}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-sm">
                  <p className="text-gray-400 mb-3">You haven't checked in yet.</p>
                  <Link href="/attendance">
                    <Button variant="outline" size="sm" className="w-full">
                      <LogIn className="w-3 h-3 mr-2" />
                      Check In Now
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Required / Notification Card */}
        {hasAwaitingProofSubmission ? (
          <Card className="border-0 shadow-sm ring-1 ring-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                  <Upload className="w-5 h-5 text-orange-600" />
                </div>
                <Badge className="bg-orange-500 animate-pulse">Action Required</Badge>
              </div>
              <div>
                <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">Pending Proofs</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">Submission</p>
                <Link href="/requests" className="mt-3 block relative w-fit pr-3">
                  <p className="text-xs text-orange-600 font-medium hover:underline flex items-center group">
                    Submit now <TrendingUp className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
                  </p>
                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending Requests</p>
                <p className="text-2xl font-bold tracking-tight">
                  {recentRequests.filter(r => r.status === 'pending').length}
                </p>
                <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile / Quick Link Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <CardContent className="p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">{profile?.full_name}</p>
                  <p className="text-xs text-gray-300">{profile?.job_title || 'Employee'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Link href="/profile">
                  <Button size="sm" variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/20 border-0">
                    Profile
                  </Button>
                </Link>
                <Link href="/verification">
                  <Button size="sm" variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/20 border-0">
                    Verify
                  </Button>
                </Link>
              </div>
            </div>
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <User className="w-32 h-32" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 3. Bento Grid - Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <AnnouncementSection />

          {/* Enhanced Recent Requests */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Recent Activity
              </h2>
              <Link href="/requests">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                  View All
                </Button>
              </Link>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
              <CardContent className="p-0">
                {recentRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileQuestion className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No recent requests</p>
                    <p className="text-sm text-gray-400 mt-1">Create a new request to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentRequests.slice(0, 5).map((request) => (
                      <div key={request.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0">
                          {getRequestIcon(request.request_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm capitalize truncate">
                              {request.request_type.split('_').join(' ')} Request
                            </p>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                              {formatDate(request.submitted_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500 truncate pr-4">
                              ID: #{request.id.slice(0, 8)}
                            </p>
                            {getStatusBadge(request.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-8">
          <LeaveSection employeeId={employee.id} />
          <DashboardCalendar events={calendarEvents} loading={calendarLoading} />
        </div>

      </div>

    </div>
  )
}
