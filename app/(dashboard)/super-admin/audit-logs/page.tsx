'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  History,
  Search,
  Filter,
  Download,
  Loader2,
  UserCheck,
  FileText,
  Settings,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  Shield,
  X,
  Calendar,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  old_values: any
  new_values: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    full_name: string
    email: string
    avatar_url: string | null
  }
}

const getActionIcon = (action: string) => {
  if (action.includes('login')) return LogIn
  if (action.includes('logout')) return LogOut
  if (action.includes('create')) return Plus
  if (action.includes('update') || action.includes('edit')) return Edit
  if (action.includes('delete')) return Trash2
  if (action.includes('approve') || action.includes('verify')) return UserCheck
  if (action.includes('role') || action.includes('permission')) return Shield
  return FileText
}

const getActionColor = (action: string) => {
  if (action.includes('login')) return 'bg-green-100 text-green-700'
  if (action.includes('logout')) return 'bg-gray-100 text-gray-700'
  if (action.includes('create')) return 'bg-blue-100 text-blue-700'
  if (action.includes('update') || action.includes('edit')) return 'bg-yellow-100 text-yellow-700'
  if (action.includes('delete')) return 'bg-red-100 text-red-700'
  if (action.includes('approve')) return 'bg-purple-100 text-purple-700'
  return 'bg-gray-100 text-gray-700'
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const actionTypes = [
  'user_login',
  'user_logout',
  'create_document',
  'update_document',
  'delete_document',
  'create_employee',
  'update_employee',
  'delete_employee',
  'approve_request',
  'reject_request',
  'role_change',
  'settings_update'
]

const entityTypes = [
  'document',
  'employee',
  'request',
  'profile',
  'department',
  'designation',
  'attendance',
  'leave'
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [selectedResource, setSelectedResource] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL('/api/super-admin/audit-logs', window.location.origin)
      url.searchParams.set('limit', limit.toString())
      url.searchParams.set('offset', offset.toString())
      if (selectedAction) url.searchParams.set('action', selectedAction)
      if (selectedResource) url.searchParams.set('resource_type', selectedResource)

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Failed to fetch audit logs')

      const data = await response.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (error) {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [offset, selectedAction, selectedResource, limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleClearFilters = () => {
    setSelectedAction('')
    setSelectedResource('')
    setSearchQuery('')
    setOffset(0)
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Resource Type', 'Old Values', 'New Values']
    const rows = logs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.user?.full_name || 'System',
      log.user?.email || 'N/A',
      log.action,
      log.resource_type || 'N/A',
      JSON.stringify(log.old_values || {}),
      JSON.stringify(log.new_values || {})
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Audit logs exported')
  }

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.action.toLowerCase().includes(query) ||
      log.user?.full_name.toLowerCase().includes(query) ||
      log.user?.email.toLowerCase().includes(query) ||
      (log.resource_type || '').toLowerCase().includes(query)
    )
  })

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <History className="w-8 h-8" />
            Audit Logs
          </h1>
          <p className="text-gray-500 mt-1">
            Track all system actions and changes
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <History className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-gray-500">Total Logs</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <LogIn className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {logs.filter(l => l.action.includes('login')).length}
              </p>
              <p className="text-sm text-gray-500">Logins Today</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Edit className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {logs.filter(l => l.action.includes('update') || l.action.includes('edit')).length}
              </p>
              <p className="text-sm text-gray-500">Updates</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {logs.filter(l => l.action.includes('delete')).length}
              </p>
              <p className="text-sm text-gray-500">Deletions</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedAction || undefined} onValueChange={(value) => setSelectedAction(value || '')}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {actionTypes.map(action => (
                <SelectItem key={action} value={action}>
                  {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedResource || undefined} onValueChange={(value) => setSelectedResource(value || '')}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              {entityTypes.map(entity => (
                <SelectItem key={entity} value={entity}>
                  {entity.charAt(0).toUpperCase() + entity.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(selectedAction || selectedResource || searchQuery) && (
            <Button variant="ghost" onClick={handleClearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
          <p className="text-sm text-gray-500">
            {searchQuery || selectedAction
              ? 'Try adjusting your filters'
              : 'Audit logs will appear here as actions are performed'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map(log => {
            const Icon = getActionIcon(log.action)
            const colorClass = getActionColor(log.action)

            return (
              <Card key={log.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn('p-3 rounded-xl flex-shrink-0', colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">
                          {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {log.user ? (
                            <>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={log.user.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(log.user.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{log.user.full_name}</span>
                              </div>
                              <span>•</span>
                              <span>{log.user.email}</span>
                            </>
                          ) : (
                            <span className="font-medium">System</span>
                          )}
                          {log.resource_type && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {log.resource_type}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                    </div>

                    {(log.old_values || log.new_values) && (
                      <div className="mt-2 space-y-1">
                        {log.old_values && Object.keys(log.old_values).length > 0 && (
                          <div className="p-2 bg-red-50 rounded text-xs">
                            <span className="font-semibold text-red-700">Old: </span>
                            <span className="font-mono text-red-600">
                              {JSON.stringify(log.old_values)}
                            </span>
                          </div>
                        )}
                        {log.new_values && Object.keys(log.new_values).length > 0 && (
                          <div className="p-2 bg-green-50 rounded text-xs">
                            <span className="font-semibold text-green-700">New: </span>
                            <span className="font-mono text-green-600">
                              {JSON.stringify(log.new_values)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {(log.ip_address || log.user_agent) && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                        {log.user_agent && (
                          <span className="truncate max-w-md">
                            {log.user_agent.split('(')[0].trim()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} logs
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2 px-3">
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
