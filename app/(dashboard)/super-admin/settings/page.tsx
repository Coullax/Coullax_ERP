'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Settings as SettingsIcon,
  Building2,
  Mail,
  Shield,
  Bell,
  Palette,
  Database,
  Loader2,
  Save,
  RefreshCw,
  Calendar,
  Clock,
  Globe,
  Users
} from 'lucide-react'
import { toast } from 'sonner'

interface OrganizationSettings {
  name: string
  email: string
  phone: string
  address: string
  website: string
  logo_url: string
  timezone: string
  date_format: string
  currency: string
  fiscal_year_start: string
}

interface SystemSettings {
  maintenance_mode: boolean
  allow_registration: boolean
  require_email_verification: boolean
  max_file_upload_size: number
  session_timeout: number
  password_min_length: number
  enable_two_factor: boolean
}

interface NotificationSettings {
  email_notifications: boolean
  push_notifications: boolean
  sms_notifications: boolean
  notify_on_new_employee: boolean
  notify_on_leave_request: boolean
  notify_on_document_upload: boolean
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: 'Coullax ERP',
    email: 'contact@coullax.com',
    phone: '+1-555-0123',
    address: '123 Business Street, Suite 100, City, State 12345',
    website: 'https://coullax.com',
    logo_url: '',
    timezone: 'UTC',
    date_format: 'YYYY-MM-DD',
    currency: 'USD',
    fiscal_year_start: '01-01'
  })

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    allow_registration: true,
    require_email_verification: true,
    max_file_upload_size: 50,
    session_timeout: 30,
    password_min_length: 8,
    enable_two_factor: false
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    notify_on_new_employee: true,
    notify_on_leave_request: true,
    notify_on_document_upload: true
  })

  const handleSaveOrganization = async () => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Organization settings saved successfully')
    } catch (error) {
      toast.error('Failed to save organization settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSystem = async () => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('System settings saved successfully')
    } catch (error) {
      toast.error('Failed to save system settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Notification settings saved successfully')
    } catch (error) {
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="w-8 h-8" />
          System Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Configure system-wide settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="organization" className="w-full">
        <TabsList>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="organization" className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  value={orgSettings.name}
                  onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-email">Email Address *</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={orgSettings.email}
                  onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-phone">Phone Number</Label>
                <Input
                  id="org-phone"
                  value={orgSettings.phone}
                  onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                  placeholder="+1-555-0123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-website">Website</Label>
                <Input
                  id="org-website"
                  value={orgSettings.website}
                  onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                  placeholder="https://company.com"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="org-address">Address</Label>
                <Textarea
                  id="org-address"
                  value={orgSettings.address}
                  onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                  placeholder="Street address, city, state, zip code"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Regional Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={orgSettings.timezone}
                  onChange={(e) => setOrgSettings({ ...orgSettings, timezone: e.target.value })}
                  placeholder="UTC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-format">Date Format</Label>
                <Input
                  id="date-format"
                  value={orgSettings.date_format}
                  onChange={(e) => setOrgSettings({ ...orgSettings, date_format: e.target.value })}
                  placeholder="YYYY-MM-DD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={orgSettings.currency}
                  onChange={(e) => setOrgSettings({ ...orgSettings, currency: e.target.value })}
                  placeholder="USD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiscal-year">Fiscal Year Start</Label>
                <Input
                  id="fiscal-year"
                  value={orgSettings.fiscal_year_start}
                  onChange={(e) => setOrgSettings({ ...orgSettings, fiscal_year_start: e.target.value })}
                  placeholder="01-01 (MM-DD)"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveOrganization} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save Organization Settings
            </Button>
          </div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security & Access
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="maintenance" className="font-normal">Maintenance Mode</Label>
                  <p className="text-xs text-gray-500">Temporarily disable access to the system</p>
                </div>
                <Switch
                  id="maintenance"
                  checked={systemSettings.maintenance_mode}
                  onCheckedChange={(checked) =>
                    setSystemSettings({ ...systemSettings, maintenance_mode: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="registration" className="font-normal">Allow Registration</Label>
                  <p className="text-xs text-gray-500">Enable new user registration</p>
                </div>
                <Switch
                  id="registration"
                  checked={systemSettings.allow_registration}
                  onCheckedChange={(checked) =>
                    setSystemSettings({ ...systemSettings, allow_registration: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="email-verification" className="font-normal">Require Email Verification</Label>
                  <p className="text-xs text-gray-500">Users must verify email before accessing system</p>
                </div>
                <Switch
                  id="email-verification"
                  checked={systemSettings.require_email_verification}
                  onCheckedChange={(checked) =>
                    setSystemSettings({ ...systemSettings, require_email_verification: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="two-factor" className="font-normal">Two-Factor Authentication</Label>
                  <p className="text-xs text-gray-500">Require 2FA for all users</p>
                </div>
                <Switch
                  id="two-factor"
                  checked={systemSettings.enable_two_factor}
                  onCheckedChange={(checked) =>
                    setSystemSettings({ ...systemSettings, enable_two_factor: checked })
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              System Limits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upload-size">Max File Upload Size (MB)</Label>
                <Input
                  id="upload-size"
                  type="number"
                  value={systemSettings.max_file_upload_size}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, max_file_upload_size: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={systemSettings.session_timeout}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, session_timeout: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-length">Minimum Password Length</Label>
                <Input
                  id="password-length"
                  type="number"
                  value={systemSettings.password_min_length}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, password_min_length: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSystem} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save System Settings
            </Button>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Global Notification Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="email-notif" className="font-normal">Email Notifications</Label>
                  <p className="text-xs text-gray-500">Send notifications via email</p>
                </div>
                <Switch
                  id="email-notif"
                  checked={notificationSettings.email_notifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, email_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="push-notif" className="font-normal">Push Notifications</Label>
                  <p className="text-xs text-gray-500">Send browser push notifications</p>
                </div>
                <Switch
                  id="push-notif"
                  checked={notificationSettings.push_notifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, push_notifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="sms-notif" className="font-normal">SMS Notifications</Label>
                  <p className="text-xs text-gray-500">Send notifications via SMS</p>
                </div>
                <Switch
                  id="sms-notif"
                  checked={notificationSettings.sms_notifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, sms_notifications: checked })
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Event Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="new-employee" className="font-normal">New Employee Joined</Label>
                  <p className="text-xs text-gray-500">Notify admins when new employee joins</p>
                </div>
                <Switch
                  id="new-employee"
                  checked={notificationSettings.notify_on_new_employee}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, notify_on_new_employee: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="leave-request" className="font-normal">Leave Requests</Label>
                  <p className="text-xs text-gray-500">Notify when leave request is submitted</p>
                </div>
                <Switch
                  id="leave-request"
                  checked={notificationSettings.notify_on_leave_request}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, notify_on_leave_request: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="doc-upload" className="font-normal">Document Uploads</Label>
                  <p className="text-xs text-gray-500">Notify when documents are uploaded</p>
                </div>
                <Switch
                  id="doc-upload"
                  checked={notificationSettings.notify_on_document_upload}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, notify_on_document_upload: checked })
                  }
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save Notification Settings
            </Button>
          </div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Theme & Branding
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      Upload Logo
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-lg bg-black border-2 border-gray-200"></div>
                  <Input type="text" value="#000000" className="max-w-32" />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Appearance customization features are coming soon. You'll be able to customize colors, fonts, and branding elements.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
