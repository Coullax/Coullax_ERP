"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BarChartComponent } from "@/components/charts/bar-chart"
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  LayoutDashboard,
  CalendarIcon,
  History,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarClient } from "./calendar/calendar-client"
import { formatDistanceToNow, format } from "date-fns"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"
import type { DashboardData } from "@/lib/types"

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
      console.log("these are data", data)
      setDashboardData(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      title: "Total Employees",
      value: (dashboardData?.stats.totalEmployees || 0).toString(),
      change: 12,
      trend: "up" as const,
      icon: Users,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
      trendColor: "text-blue-600",
    },
    {
      title: "Pending Requests",
      value: ((dashboardData?.stats.adminApprovalPendingRequests || 0) + (dashboardData?.stats.pendingRequests || 0)).toString(),
      change: -8,
      trend: "down" as const,
      icon: FileText,
      bg: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600",
      trendColor: "text-orange-600",
    },
    {
      title: "Active Events",
      value: (dashboardData?.stats.monthEventCount || 0).toString(),
      change: 2.4,
      trend: "up" as const,
      icon: Clock,
      bg: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600",
      trendColor: "text-purple-600",
    },
    {
      title: "Success Rate",
      value: "98.2%",
      change: 1.2,
      trend: "up" as const,
      icon: CheckCircle,
      bg: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600",
      trendColor: "text-green-600",
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
    const label = status
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
    return (
      <span className={className}>{label}</span>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-(--breakpoint-2xl) mx-auto bg-background min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
            <LayoutDashboard className="w-3 h-3" />
            <span>Overview</span>
            <span>/</span>
            <span className="text-foreground">Analytics Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System performance is stable. {dashboardData?.stats.pendingRequests || 0} requests awaiting your review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs font-semibold text-foreground">{format(new Date(), "HH:mm")}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
              {format(new Date(), "EEE, MMM d")}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-2 bg-transparent">
            <CalendarIcon className="w-4 h-4" />
            Schedule
          </Button>
          <Button
            size="sm"
            className="h-9 bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95"
          >
            Export Report
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50/50 transition-colors"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("w-4 h-4", stat.iconColor)} />
                </div>
                <Badge
                  variant="secondary"
                  className="bg-transparent text-[10px] font-bold px-1.5 h-5 flex items-center gap-1"
                >
                  <span className={cn("flex items-center", stat.change >= 0 ? "text-green-600" : "text-red-600")}>
                    {stat.change >= 0 ? <ArrowUp className="w-2.5 h-2.5 mr-1" /> : <ArrowDown className="w-2.5 h-2.5 mr-1" />}
                    {Math.abs(stat.change)}%
                  </span>
                </Badge>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground italic">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 flex flex-col gap-6">
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900 flex-1 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Request Distribution</CardTitle>
                <CardDescription className="text-xs">Daily volume per request category</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-[10px] uppercase font-medium text-muted-foreground">Main Metric</span>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {loading ? (
                <div className="h-[320px] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <BarChartComponent
                    title=""
                    data={dashboardData?.requestDistribution || []}
                    dataKey="value"
                    color="#3b82f6"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-lg overflow-hidden border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900">
            <CalendarClient />
          </div>
        </div>

        <aside className="xl:col-span-4 space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">Live Feed</CardTitle>
              </div>
              <Button
                variant="link"
                size="sm"
                className="text-[10px] uppercase font-bold tracking-tighter text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/admin/approvals")}
              >
                View Logs
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground animate-pulse">Syncing data...</span>
                </div>
              ) : dashboardData?.recentRequests && dashboardData.recentRequests.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dashboardData.recentRequests.slice(0, 7).map((request) => (
                    <div
                      key={request.id}
                      className="group p-4 flex flex-col gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer border-l-2 border-transparent hover:border-primary"
                      onClick={() => router.push(`/admin/approvals`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-xs text-foreground uppercase tracking-tight group-hover:text-primary transition-colors truncate">
                            {request.type}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            {request.employee}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {formatDistanceToNow(new Date(request.date), { addSuffix: false })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-widest">Idle State</p>
                  <p className="text-xs text-muted-foreground mt-1">No active requests found in the system logs.</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span>System Uptime: 99.9%</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
