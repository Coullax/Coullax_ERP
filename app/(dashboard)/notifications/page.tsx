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
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

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
      return 'bg-blue-100 text-blue-600'
    case 'leave_request':
      return 'bg-green-100 text-green-600'
    case 'verification':
      return 'bg-purple-100 text-purple-600'
    case 'alert':
      return 'bg-red-100 text-red-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
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

      toast.success('Preferences saved')
      setPreferencesOpen(false)
    } catch (error) {
      toast.error('Failed to save preferences')
    } finally {
      setSavingPreferences(false)
    }
  }

  const filteredNotifications = notifications

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
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notifications.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <BellOff className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-sm text-gray-500">Unread</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notifications.filter(n => n.read).length}</p>
              <p className="text-sm text-gray-500">Read</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Notifications
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="warning" className="ml-2 px-1.5 py-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-sm text-gray-500">
                {activeTab === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)
                const iconColor = getNotificationColor(notification.type)

                return (
                  <Card
                    key={notification.id}
                    className={cn(
                      'p-4 transition-all cursor-pointer hover:shadow-md',
                      !notification.read && 'bg-blue-50 border-blue-200'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn('p-3 rounded-xl flex-shrink-0', iconColor)}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className="font-semibold text-sm">{notification.title}</h3>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
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
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
          )}
        </TabsContent>
      </Tabs>

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
