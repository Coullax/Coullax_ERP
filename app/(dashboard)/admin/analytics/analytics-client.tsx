'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Calendar,
  FileText,
  Building2,
} from 'lucide-react'

interface AnalyticsPageClientProps {
  analytics: any
}

export function AnalyticsPageClient({ analytics }: AnalyticsPageClientProps) {
  const {
    totalEmployees,
    attendanceStats,
    leaveStats,
    requestsByType,
    requestsByStatus,
    departmentStats,
    currentMonth,
  } = analytics

  const totalAttendance =
    attendanceStats.present + attendanceStats.absent + attendanceStats.leave + attendanceStats.halfDay
  const attendanceRate = totalAttendance > 0 
    ? ((attendanceStats.present + attendanceStats.halfDay * 0.5) / totalAttendance * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of attendance, leave, and performance metrics for {new Date(currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-3xl font-bold">{totalEmployees}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Attendance Rate</p>
                <p className="text-3xl font-bold">{attendanceRate}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Requests</p>
                <p className="text-3xl font-bold">{requestsByStatus.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Leave Requests</p>
                <p className="text-3xl font-bold">{leaveStats.pending + leaveStats.approved + leaveStats.rejected}</p>
              </div>
              <Calendar className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-semibold">Present</p>
                    <p className="text-sm text-gray-500">Days marked present</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{attendanceStats.present}</p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="font-semibold">Absent</p>
                    <p className="text-sm text-gray-500">Days marked absent</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{attendanceStats.absent}</p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-950">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-semibold">On Leave</p>
                    <p className="text-sm text-gray-500">Days on approved leave</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{attendanceStats.leave}</p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="font-semibold">Half Day</p>
                    <p className="text-sm text-gray-500">Half day attendance</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{attendanceStats.halfDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Requests Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="font-semibold">Pending</p>
                    <p className="text-sm text-gray-500">Awaiting approval</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{leaveStats.pending}</p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-semibold">Approved</p>
                    <p className="text-sm text-gray-500">Approved leave requests</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{leaveStats.approved}</p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="font-semibold">Rejected</p>
                    <p className="text-sm text-gray-500">Declined leave requests</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{leaveStats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Requests by Type (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(requestsByType).map(([type, count]: [string, any]) => (
              <div key={type} className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800">
                <FileText className="w-6 h-6 mb-2 text-gray-400" />
                <p className="text-xs text-gray-500 capitalize">{type.replace('_', ' ')}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Employees by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {departmentStats.map((dept: any) => {
              const percentage = totalEmployees > 0 ? (dept.count / totalEmployees * 100).toFixed(1) : 0
              return (
                <div key={dept.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{dept.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {dept.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-black dark:bg-white h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
