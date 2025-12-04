'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'

export function GreetingCard() {
  const { profile } = useAuthStore()
  const hour = new Date().getHours()

  const getGreeting = () => {
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getEmoji = () => {
    if (hour < 12) return '☀️'
    if (hour < 18) return '👋'
    return '🌙'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-black border-none">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{getEmoji()}</span>
            <div>
              <h2 className="text-2xl font-bold">
                {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}!
              </h2>
              <p className="text-sm opacity-80 mt-1">
                Welcome back to your dashboard. Here&apos;s what&apos;s happening today.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
