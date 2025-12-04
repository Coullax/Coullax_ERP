'use client'

import { GreetingCard } from '@/components/dashboard/greeting-card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { LineChartComponent } from '@/components/charts/line-chart'
import { Users, FileText, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Mock data - replace with real data from Supabase
const stats = [
  {
    title: 'Total Employees',
    value: '248',
    change: 12,
    trend: 'up' as const,
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: 'Pending Requests',
    value: '14',
    change: -8,
    trend: 'down' as const,
    icon: <FileText className="w-5 h-5" />,
  },
  {
    title: 'Attendance Rate',
    value: '94.2%',
    change: 2.4,
    trend: 'up' as const,
    icon: <Clock className="w-5 h-5" />,
  },
  {
    title: 'Completed Tasks',
    value: '157',
    change: 18,
    trend: 'up' as const,
    icon: <CheckCircle className="w-5 h-5" />,
  },
]

const attendanceData = [
  { name: 'Mon', value: 95 },
  { name: 'Tue', value: 92 },
  { name: 'Wed', value: 94 },
  { name: 'Thu', value: 96 },
  { name: 'Fri', value: 93 },
  { name: 'Sat', value: 88 },
  { name: 'Sun', value: 0 },
]

const recentRequests = [
  { id: 1, type: 'Leave', employee: 'John Doe', status: 'pending', date: '2024-12-04' },
  { id: 2, type: 'Overtime', employee: 'Jane Smith', status: 'approved', date: '2024-12-03' },
  { id: 3, type: 'Travel', employee: 'Bob Johnson', status: 'pending', date: '2024-12-02' },
  { id: 4, type: 'Expense', employee: 'Alice Brown', status: 'rejected', date: '2024-12-01' },
]

export function AdminDashboardClient() {
  return (
    <div className="space-y-6">
      {/* Greeting Card */}
      <GreetingCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            icon={stat.icon}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <div className="lg:col-span-2">
          <LineChartComponent
            title="Weekly Attendance"
            data={attendanceData}
            dataKey="value"
            color="#000000"
          />
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{request.type}</p>
                  <p className="text-xs text-gray-500">{request.employee}</p>
                </div>
                <Badge
                  variant={
                    request.status === 'approved'
                      ? 'success'
                      : request.status === 'rejected'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {request.status}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View All Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
