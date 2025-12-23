// Test file to manually trigger a browser notification
// Run this in the browser console to test notifications

import { notificationService } from '@/lib/notification-service'

export async function testBrowserNotification() {
    console.log('=== Testing Browser Notifications ===')

    // Check if supported
    console.log('1. Checking browser support...')
    const isSupported = notificationService.isSupported()
    console.log('   Supported:', isSupported)

    if (!isSupported) {
        console.error('   Browser notifications are not supported!')
        return
    }

    // Check current permission
    console.log('2. Checking current permission...')
    const currentPermission = notificationService.getPermission()
    console.log('   Current permission:', currentPermission)

    // Request permission if needed
    if (currentPermission !== 'granted') {
        console.log('3. Requesting permission...')
        const permission = await notificationService.requestPermission()
        console.log('   Permission result:', permission)

        if (permission !== 'granted') {
            console.error('   Permission denied!')
            return
        }
    }

    // Show test notification
    console.log('4. Showing test notification...')
    const notification = await notificationService.showNotification({
        title: 'Test Notification',
        message: 'This is a test browser notification from Coullax ERP',
        type: 'info',
        link: '/notifications'
    })

    if (notification) {
        console.log('   ✅ Notification shown successfully!')
    } else {
        console.error('   ❌ Failed to show notification')
    }

    console.log('=== Test Complete ===')
}

// Auto-run test
if (typeof window !== 'undefined') {
    console.log('Browser notification test utility loaded.')
    console.log('Run testBrowserNotification() to test notifications')
}
