'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GreetingCard } from '@/components/dashboard/greeting-card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { BarChartComponent } from '@/components/charts/bar-chart'
import { Users, FileText, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarClient } from './calendar/calendar-client'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface RequestDistribution {
  name: string
  value: number
}

interface RecentRequest {
  id: string
  type: string
  employee: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  date: string
}

interface DashboardData {
  requestDistribution: RequestDistribution[]
  recentRequests: RecentRequest[]
  stats: {
    totalEmployees: number
    pendingRequests: number
  }
}

export function AdminDashboardClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')

      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      title: 'Total Employees',
      value: dashboardData?.stats.totalEmployees.toString() || '0',
      change: 12,
      trend: 'up' as const,
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: 'Pending Requests',
      value: dashboardData?.stats.pendingRequests.toString() || '0',
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

      <CalendarClient />

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Distribution Chart */}
        <div className="lg:col-span-2">
          {loading ? (
            <Card>
              <CardHeader>
                <CardTitle>Request Type Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
          ) : (
            <BarChartComponent
              title="Request Type Distribution"
              data={dashboardData?.requestDistribution || []}
              dataKey="value"
              color="#3b82f6"
            />
          )}
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : dashboardData?.recentRequests && dashboardData.recentRequests.length > 0 ? (
              <>
                {dashboardData.recentRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{request.type}</p>
                      <p className="text-xs text-gray-500 truncate">{request.employee}</p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(request.date), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        request.status === 'approved'
                          ? 'success'
                          : request.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="ml-2"
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push('/admin/approvals')}
                >
                  View All Requests
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
