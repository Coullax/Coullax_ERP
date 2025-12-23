'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChartComponent } from '@/components/charts/bar-chart'
import { Users, FileText, Clock, CheckCircle, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarClient } from './calendar/calendar-client'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { useAuthStore } from '@/store/auth-store'

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
    monthEventCount: number
  }
}

export function AdminDashboardClient() {
  const router = useRouter()
  const { profile } = useAuthStore()
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
      icon: <Users className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Pending Requests',
      value: dashboardData?.stats.pendingRequests.toString() || '0',
      change: -8,
      trend: 'down' as const,
      icon: <FileText className="w-5 h-5 text-orange-600" />,
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      title: "Total Events",
      value: dashboardData?.stats.monthEventCount.toString() || '0',
      change: 0,
      trend: 'up' as const,
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Completed Tasks',
      value: '157',
      change: 18,
      trend: 'up' as const,
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
  ]

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
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={stat.title} className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  {stat.icon}
                </div>
                {stat.change !== undefined && (
                  <div className={`flex items-center text-xs font-medium ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                <p className="text-2xl font-bold tracking-tight mt-1">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CalendarClient />

      {/* 3. Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request Distribution Chart */}
        <div className="lg:col-span-2">
          {loading ? (
            <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 h-full">
              <CardHeader>
                <CardTitle>Request Type Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
          ) : (
            <div className="h-full p-1 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <BarChartComponent
                title="Request Type Distribution"
                data={dashboardData?.requestDistribution || []}
                dataKey="value"
                color="#3b82f6"
              />
            </div>
          )}
        </div>

        {/* Recent Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              Recent Requests
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-900"
              onClick={() => router.push('/admin/approvals')}
            >
              View All
            </Button>
          </div>

          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : dashboardData?.recentRequests && dashboardData.recentRequests.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dashboardData.recentRequests.slice(0, 5).map((request) => (
                    <div
                      key={request.id}
                      className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/approvals`)} // Or specific detail link
                    >
                      <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{request.type}</p>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(request.date), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500 truncate">{request.employee}</p>
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No recent requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
