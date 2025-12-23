'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Loader2,
  FileText,
  Calendar,
  UserCheck,
  AlertCircle,
  Info,
  Filter,
  BellRing
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, startOfDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { notificationService } from '@/lib/notification-service'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  created_at: string
}

interface NotificationPreferences {
  email_enabled: boolean
  push_enabled: boolean
  leave_updates: boolean
  attendance_alerts: boolean
  meeting_reminders: boolean
  announcements: boolean
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'document_request':
      return FileText
    case 'leave_request':
      return Calendar
    case 'verification':
      return UserCheck
    case 'alert':
      return AlertCircle
    default:
      return Info
  }
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'document_request':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
    case 'leave_request':
      return 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
    case 'verification':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
    case 'alert':
      return 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

const getNotificationTypeLabel = (type: string) => {
  switch (type) {
    case 'document_request':
      return 'Document Request'
    case 'leave_request':
      return 'Leave Request'
    case 'verification':
      return 'Verification'
    case 'alert':
      return 'Alert'
    default:
      return 'Info'
  }
}

const getDateGroup = (dateString: string) => {
  const date = new Date(dateString)

  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'This Week'
  return 'Earlier'
}

const groupNotificationsByDate = (notifications: Notification[]) => {
  const groups: Record<string, Notification[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Earlier': []
  }

  notifications.forEach(notification => {
    const group = getDateGroup(notification.created_at)
    groups[group].push(notification)
  })

  return groups
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    push_enabled: true,
    leave_updates: true,
    attendance_alerts: true,
    meeting_reminders: true,
    announcements: true
  })
  const [savingPreferences, setSavingPreferences] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL('/api/notifications', window.location.origin)
      if (activeTab === 'unread') {
        url.searchParams.set('unread_only', 'true')
      }

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Failed to fetch notifications')

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      if (!response.ok) throw new Error('Failed to fetch preferences')

      const data = await response.json()
      setPreferences(data)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    fetchPreferences()
  }, [fetchNotifications, fetchPreferences])

  // Subscribe to real-time notifications and request permission if needed
  useEffect(() => {
    // Get current user ID from the session
    const setupNotifications = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()

          // If we have notifications, we can get the user_id from the first one
          // Or we can fetch it from auth
          const supabase = (await import('@/lib/supabase/client')).createClient()
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            // Subscribe to real-time notifications using the store
            const { subscribeToNotifications } = (await import('@/store/notification-store')).useNotificationStore.getState()
            const unsubscribe = subscribeToNotifications(user.id)

            // Request browser notification permission if push is enabled
            if (preferences.push_enabled && notificationService.isSupported()) {
              const permission = await notificationService.requestPermission()
              if (permission === 'granted') {
                console.log('Browser notifications enabled')
              }
            }

            return unsubscribe
          }
        }
      } catch (error) {
        console.error('Failed to setup notifications:', error)
      }
    }

    const cleanup = setupNotifications()

    return () => {
      cleanup.then(unsubscribe => {
        if (unsubscribe) unsubscribe()
      })
    }
  }, [preferences.push_enabled])

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      })

      if (!response.ok) throw new Error('Failed to mark as read')

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      toast.success('Marked as read')
    } catch (error) {
      toast.error('Failed to mark as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })

      if (!response.ok) throw new Error('Failed to mark all as read')

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all as read')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete notification')

      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Notification deleted')
    } catch (error) {
      toast.error('Failed to delete notification')
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id)
    }
    if (notification.link) {
      window.location.href = notification.link
    }
  }

  const handleSavePreferences = async () => {
    setSavingPreferences(true)
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) throw new Error('Failed to save preferences')

      // Request browser notification permission if push is enabled
      if (preferences.push_enabled && notificationService.isSupported()) {
        const permission = await notificationService.requestPermission()
        if (permission === 'denied') {
          toast.warning('Browser notifications are blocked. Please enable them in your browser settings.')
        } else if (permission === 'granted') {
          toast.success('Preferences saved and browser notifications enabled')
        }
      } else {
        toast.success('Preferences saved')
      }

      setPreferencesOpen(false)
    } catch (error) {
      toast.error('Failed to save preferences')
    } finally {
      setSavingPreferences(false)
    }
  }

  // Filter notifications by type
  const filteredNotifications = typeFilter
    ? notifications.filter(n => n.type === typeFilter)
    : notifications

  // Group notifications by date
  const groupedNotifications = groupNotificationsByDate(filteredNotifications)

  // Get unique notification types for filter
  const notificationTypes = Array.from(new Set(notifications.map(n => n.type)))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8" />
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">
            Stay updated with your latest activities
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setPreferencesOpen(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </Button>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notifications.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
              <BellRing className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-sm text-gray-500">Unread</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notifications.filter(n => n.read).length}</p>
              <p className="text-sm text-gray-500">Read</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All Notifications
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="warning" className="ml-2 px-1.5 py-0 text-xs bg-red-500">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Type Filter */}
        {notificationTypes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
            <Button
              variant={typeFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(null)}
            >
              All Types
            </Button>
            {notificationTypes.map(type => (
              <Button
                key={type}
                variant={typeFilter === type ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(type)}
              >
                {getNotificationTypeLabel(type)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No notifications</h3>
            <p className="text-sm text-gray-500">
              {activeTab === 'unread'
                ? "You're all caught up! No unread notifications."
                : typeFilter
                  ? `No ${getNotificationTypeLabel(typeFilter).toLowerCase()} notifications found.`
                  : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          <>
            {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => {
              if (groupNotifications.length === 0) return null

              return (
                <div key={dateGroup} className="space-y-3">
                  {/* Date Header */}
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {dateGroup}
                    </h2>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  </div>

                  {/* Notifications in this group */}
                  <div className="space-y-3">
                    {groupNotifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type)
                      const iconColor = getNotificationColor(notification.type)

                      return (
                        <Card
                          key={notification.id}
                          className={cn(
                            'p-4 transition-all cursor-pointer hover:shadow-md',
                            !notification.read && 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={cn('p-3 relative rounded-xl flex-shrink-0', iconColor)}>
                              {!notification.read && (
                                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-600 flex-shrink-0 mt-1.5" />
                              )}
                              <Icon className="w-5 h-5" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-1">
                                <h3 className="font-semibold text-sm">{notification.title}</h3>

                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notification.message}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-400">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </p>
                                <span className="text-gray-300 dark:text-gray-700">•</span>
                                <Badge variant="secondary" className="text-xs">
                                  {getNotificationTypeLabel(notification.type)}
                                </Badge>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 flex-shrink-0">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkAsRead(notification.id)
                                  }}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(notification.id)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Preferences Dialog */}
      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Customize how and when you receive notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Delivery Methods */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Delivery Methods</h3>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email_enabled" className="font-normal">Email Notifications</Label>
                  <p className="text-xs text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  id="email_enabled"
                  checked={preferences.email_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, email_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push_enabled" className="font-normal">Push Notifications</Label>
                  <p className="text-xs text-gray-500">Receive browser push notifications</p>
                </div>
                <Switch
                  id="push_enabled"
                  checked={preferences.push_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, push_enabled: checked })
                  }
                />
              </div>
            </div>

            {/* Notification Types */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Notification Types</h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="leave_updates" className="font-normal">Leave Updates</Label>
                <Switch
                  id="leave_updates"
                  checked={preferences.leave_updates}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, leave_updates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="attendance_alerts" className="font-normal">Attendance Alerts</Label>
                <Switch
                  id="attendance_alerts"
                  checked={preferences.attendance_alerts}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, attendance_alerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="meeting_reminders" className="font-normal">Meeting Reminders</Label>
                <Switch
                  id="meeting_reminders"
                  checked={preferences.meeting_reminders}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, meeting_reminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="announcements" className="font-normal">Announcements</Label>
                <Switch
                  id="announcements"
                  checked={preferences.announcements}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, announcements: checked })
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setPreferencesOpen(false)}
                className="flex-1"
                disabled={savingPreferences}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePreferences}
                className="flex-1"
                disabled={savingPreferences}
              >
                {savingPreferences && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
