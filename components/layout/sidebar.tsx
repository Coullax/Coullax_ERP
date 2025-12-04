'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileCheck,
  FileText,
  Clock,
  BarChart3,
  Calendar,
  Bell,
  HelpCircle,
  Settings,
  UserCircle,
  Shield,
  FolderOpen,
  UserCog,
  History,
  Building2,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const employeeNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/employee' },
  { icon: UserCircle, label: 'Profile', href: '/profile' },
  { icon: FileCheck, label: 'Verification', href: '/verification' },
  { icon: FileText, label: 'Requests', href: '/requests' },
  { icon: Clock, label: 'Attendance', href: '/attendance' },
  { icon: Calendar, label: 'Calendar', href: '/calendar' },
  { icon: FolderOpen, label: 'Documents', href: '/documents' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: HelpCircle, label: 'Help Center', href: '/help' },
]

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Admin Dashboard', href: '/' },
  { icon: Users, label: 'Employees', href: '/admin/employees' },
  { icon: FileCheck, label: 'Verifications', href: '/admin/verifications' },
  { icon: FileText, label: 'Approvals', href: '/admin/approvals' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
]

const superAdminNavItems = [
  { icon: Shield, label: 'Admins', href: '/super-admin/admins' },
  { icon: Building2, label: 'Departments', href: '/super-admin/departments' },
  { icon: UserCog, label: 'Roles', href: '/super-admin/roles' },
  { icon: History, label: 'Audit Logs', href: '/super-admin/audit-logs' },
  { icon: Settings, label: 'Settings', href: '/super-admin/settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, isAdmin, isSuperAdmin, setUser, setProfile } = useAuthStore()

  const navigationItems = [
    ...employeeNavItems,
    ...(isAdmin() ? adminNavItems : []),
    ...(isSuperAdmin() ? superAdminNavItems : []),
  ]

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      
      // Clear auth store
      setUser(null)
      setProfile(null)
      
      toast.success('Logged out successfully')
      router.push('/login')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to logout')
    }
  }

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="fixed left-0 top-0 z-30 h-screen w-72 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col"
    >
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center">
            <span className="text-xl font-bold text-white dark:text-black">C</span>
          </div>
          <div>
            <h1 className="font-bold text-lg">COULLAX</h1>
            <p className="text-xs text-gray-500">DeskFlow</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-item",
                isActive ? "sidebar-item-active" : "sidebar-item-inactive"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors cursor-pointer">
          <Avatar>
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>{profile ? getInitials(profile.full_name) : 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{profile?.role || 'Employee'}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full mt-2 justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </motion.aside>
  )
}
