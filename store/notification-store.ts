import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  link?: string
  created_at: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  fetchNotifications: (userId: string) => Promise<void>
  subscribeToNotifications: (userId: string) => () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length
    set({ notifications, unreadCount })
  },

  addNotification: (notification) => {
    const { notifications } = get()
    const newNotifications = [notification, ...notifications]
    const unreadCount = newNotifications.filter((n) => !n.read).length
    set({ notifications: newNotifications, unreadCount })
  },

  markAsRead: async (id) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    const { notifications } = get()
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    )
    const unreadCount = updated.filter((n) => !n.read).length
    set({ notifications: updated, unreadCount })
  },

  markAllAsRead: async () => {
    const { notifications } = get()
    const supabase = createClient()
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)

    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)
    }

    set({
      notifications: notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })
  },

  fetchNotifications: async (userId) => {
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      get().setNotifications(data)
    }
    set({ loading: false })
  },

  subscribeToNotifications: (userId) => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          get().addNotification(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
