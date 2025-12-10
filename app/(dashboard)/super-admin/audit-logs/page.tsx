'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
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
  User,
  Eye,
  CalendarRange
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

const getActionBadgeStyle = (action: string): React.CSSProperties => {
  const actionLower = action.toLowerCase()
  if (actionLower.includes('login')) return { backgroundColor: '#dcfce7', color: '#15803d' } // green-100/green-700
  if (actionLower.includes('logout')) return { backgroundColor: '#f3f4f6', color: '#374151' } // gray-100/gray-700
  if (actionLower.includes('create') || actionLower.includes('insert')) return { backgroundColor: '#dbeafe', color: '#1d4ed8' } // blue-100/blue-700
  if (actionLower.includes('update') || actionLower.includes('edit')) return { backgroundColor: '#fef3c7', color: '#a16207' } // amber-100/amber-700
  if (actionLower.includes('delete')) return { backgroundColor: '#fee2e2', color: '#b91c1c' } // red-100/red-700
  if (actionLower.includes('approve') || actionLower.includes('verify')) return { backgroundColor: '#f3e8ff', color: '#7e22ce' } // purple-100/purple-700
  return { backgroundColor: '#f3f4f6', color: '#374151' } // gray default
}

const getResourceStyle = (resourceType: string): React.CSSProperties => {
  const colors: Record<string, React.CSSProperties> = {
    document: { backgroundColor: '#e0e7ff', color: '#4338ca' }, // indigo-100/indigo-700
    employee: { backgroundColor: '#cffafe', color: '#0e7490' }, // cyan-100/cyan-700
    request: { backgroundColor: '#fce7f3', color: '#be185d' }, // pink-100/pink-700
    profile: { backgroundColor: '#ccfbf1', color: '#0f766e' }, // teal-100/teal-700
    department: { backgroundColor: '#fed7aa', color: '#c2410c' }, // orange-100/orange-700
    designation: { backgroundColor: '#ecfccb', color: '#4d7c0f' }, // lime-100/lime-700
    attendance: { backgroundColor: '#ede9fe', color: '#6d28d9' }, // violet-100/violet-700
    leave: { backgroundColor: '#ffe4e6', color: '#be123c' }, // rose-100/rose-700
  }
  return colors[resourceType.toLowerCase()] || { backgroundColor: '#f1f5f9', color: '#475569' } // slate default
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
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
      if (startDate) url.searchParams.set('start_date', startDate)
      if (endDate) url.searchParams.set('end_date', endDate)

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
  }, [offset, selectedAction, selectedResource, startDate, endDate, limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleClearFilters = () => {
    setSelectedAction('')
    setSelectedResource('')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Action Filter */}
          <Select 
            value={selectedAction || 'all'} 
            onValueChange={(value) => {
              setSelectedAction(value === 'all' ? '' : value)
              setOffset(0)
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map(action => (
                <SelectItem key={action} value={action}>
                  {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Resource Filter */}
          <Select 
            value={selectedResource || 'all'} 
            onValueChange={(value) => {
              setSelectedResource(value === 'all' ? '' : value)
              setOffset(0)
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {entityTypes.map(entity => (
                <SelectItem key={entity} value={entity}>
                  {entity.charAt(0).toUpperCase() + entity.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filters */}
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setOffset(0)
            }}
            className="w-[150px]"
            placeholder="Start Date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setOffset(0)
            }}
            className="w-[150px]"
            placeholder="End Date"
          />

          {/* Clear Filters */}
          {(selectedAction || selectedResource || searchQuery || startDate || endDate) && (
            <Button variant="ghost" onClick={handleClearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </Card>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
          <p className="text-sm text-gray-500">
            {searchQuery || selectedAction || startDate || endDate
              ? 'Try adjusting your filters'
              : 'Audit logs will appear here as actions are performed'}
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => {
                const Icon = getActionIcon(log.action)
                const colorClass = getActionColor(log.action)

                return (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    {/* Timestamp */}
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                    </TableCell>

                    {/* User */}
                    <TableCell>
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={log.user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(log.user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{log.user.full_name}</p>
                            <p className="text-xs text-gray-500">{log.user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">System</span>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell>
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                        style={getActionBadgeStyle(log.action)}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </TableCell>

                    {/* Resource */}
                    <TableCell>
                      {log.resource_type ? (
                        <span 
                          className="inline-block px-2.5 py-1 rounded-md text-xs font-medium"
                          style={getResourceStyle(log.resource_type)}
                        >
                          {log.resource_type.charAt(0).toUpperCase() + log.resource_type.slice(1)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log)
                          setDetailsOpen(true)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {selectedLog.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </DialogTitle>
                <DialogDescription>
                  Log ID: {selectedLog.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Timestamp */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-500">Timestamp</p>
                    <p className="text-sm">
                      {format(new Date(selectedLog.created_at), 'MMMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* User Information */}
                {selectedLog.user ? (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-500 mb-2">User</p>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedLog.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(selectedLog.user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{selectedLog.user.full_name}</p>
                          <p className="text-xs text-gray-500">{selectedLog.user.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-500">User</p>
                      <p className="text-sm">System</p>
                    </div>
                  </div>
                )}

                {/* Resource Information */}
                {(selectedLog.resource_type || selectedLog.resource_id) && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-500 mb-1">Resource</p>
                        <div className="space-y-1">
                          {selectedLog.resource_type && (
                            <p className="text-sm">
                              <span className="font-medium">Type:</span>{' '}
                              <Badge variant="outline">{selectedLog.resource_type}</Badge>
                            </p>
                          )}
                          {selectedLog.resource_id && (
                            <p className="text-sm">
                              <span className="font-medium">ID:</span>{' '}
                              <span className="font-mono text-xs">{selectedLog.resource_id}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Old Values */}
                {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium text-sm text-gray-500 mb-2">Old Values</p>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <pre className="text-xs font-mono text-red-700 overflow-x-auto">
                          {JSON.stringify(selectedLog.old_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}

                {/* New Values */}
                {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium text-sm text-gray-500 mb-2">New Values</p>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <pre className="text-xs font-mono text-green-700 overflow-x-auto">
                          {JSON.stringify(selectedLog.new_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}

                {/* Technical Details */}
                {(selectedLog.ip_address || selectedLog.user_agent) && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium text-sm text-gray-500 mb-2">Technical Details</p>
                      <div className="space-y-2">
                        {selectedLog.ip_address && (
                          <p className="text-sm">
                            <span className="font-medium">IP Address:</span>{' '}
                            <span className="font-mono text-xs">{selectedLog.ip_address}</span>
                          </p>
                        )}
                        {selectedLog.user_agent && (
                          <p className="text-sm">
                            <span className="font-medium">User Agent:</span>{' '}
                            <span className="text-xs text-gray-600">{selectedLog.user_agent}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
