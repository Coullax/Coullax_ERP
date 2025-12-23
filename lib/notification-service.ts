/**
 * Browser Notification Service
 * Handles browser push notifications for the application
 */

export interface BrowserNotificationOptions {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: any
    requireInteraction?: boolean
}

class NotificationService {
    private static instance: NotificationService
    private permission: NotificationPermission = 'default'

    private constructor() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permission = Notification.permission
        }
    }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService()
        }
        return NotificationService.instance
    }

    /**
     * Check if browser supports notifications
     */
    isSupported(): boolean {
        return typeof window !== 'undefined' && 'Notification' in window
    }

    /**
     * Get current permission status
     */
    getPermission(): NotificationPermission {
        // Always get the latest permission from the browser
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permission = Notification.permission
        }
        return this.permission
    }

    /**
     * Request notification permission from user
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) {
            console.warn('Browser notifications are not supported')
            return 'denied'
        }

        // Check current permission first
        this.permission = Notification.permission
        if (this.permission === 'granted') {
            console.log('Notification permission already granted')
            return 'granted'
        }

        try {
            console.log('Requesting notification permission...')
            const permission = await Notification.requestPermission()
            this.permission = permission
            console.log('Notification permission result:', permission)
            return permission
        } catch (error) {
            console.error('Error requesting notification permission:', error)
            return 'denied'
        }
    }

    /**
     * Show a browser notification
     */
    async show(options: BrowserNotificationOptions): Promise<Notification | null> {
        console.log('show() called with options:', options)

        if (!this.isSupported()) {
            console.warn('Browser notifications are not supported')
            return null
        }

        // Always check current permission
        this.permission = Notification.permission
        console.log('Current notification permission:', this.permission)

        // Request permission if not already granted
        if (this.permission !== 'granted') {
            console.log('Permission not granted, requesting...')
            const permission = await this.requestPermission()
            if (permission !== 'granted') {
                console.warn('Notification permission denied by user')
                return null
            }
        }

        try {
            console.log('Creating browser notification...')
            const notification = new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/logo.png',
                badge: options.badge || '/logo.png',
                tag: options.tag,
                data: options.data,
                requireInteraction: options.requireInteraction || false,
            })

            console.log('Browser notification created successfully:', notification)

            // Handle notification click
            notification.onclick = (event) => {
                event.preventDefault()
                window.focus()

                // Navigate to link if provided in data
                if (options.data?.link) {
                    window.location.href = options.data.link
                }

                notification.close()
            }

            return notification
        } catch (error) {
            console.error('Error showing notification:', error)
            return null
        }
    }

    /**
     * Show notification for a new notification item
     */
    async showNotification(notification: {
        title: string
        message: string
        type: string
        link?: string | null
    }): Promise<Notification | null> {
        const typeIcons: Record<string, string> = {
            document_request: '📄',
            leave_request: '📅',
            verification: '✅',
            alert: '⚠️',
            info: 'ℹ️',
        }

        const icon = typeIcons[notification.type] || typeIcons.info

        // Use timestamp to create unique tag - prevents browser throttling
        const uniqueTag = `${notification.type}-${Date.now()}`

        return this.show({
            title: `${icon} ${notification.title}`,
            body: notification.message,
            tag: uniqueTag,
            data: {
                link: notification.link || '/notifications',
            },
            requireInteraction: false,
        })
    }

    /**
     * Clear all notifications with a specific tag
     */
    clearByTag(tag: string): void {
        // Note: This is not directly supported by the Notifications API
        // Notifications are automatically cleared by the browser
        console.log(`Clearing notifications with tag: ${tag}`)
    }
}

export const notificationService = NotificationService.getInstance()
