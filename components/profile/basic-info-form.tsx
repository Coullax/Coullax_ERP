'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateProfile, updateEmployeeInfo } from '@/app/actions/profile-actions'
import { Save } from 'lucide-react'

interface BasicInfoFormProps {
  userId: string
  profile: any
  employee: any
}

export function BasicInfoForm({ userId, profile, employee }: BasicInfoFormProps) {
  const [loading, setLoading] = useState(false)

  // Disable form if employee is verified
  const isFormDisabled = employee?.isverified === true

  const [formData, setFormData] = useState({
    // Profile data
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    email: profile?.email || '',

    // Employee data
    employee_id: employee?.employee_id || '',
    date_of_birth: employee?.date_of_birth || '',
    gender: employee?.gender || '',
    blood_group: employee?.blood_group || '',
    marital_status: employee?.marital_status || '',
    joining_date: employee?.joining_date || '',

    // Address
    address: employee?.address || '',
    city: employee?.city || '',
    state: employee?.state || '',
    postal_code: employee?.postal_code || '',
    country: employee?.country || 'USA',

    // Emergency contact
    emergency_contact_name: employee?.emergency_contact_name || '',
    emergency_contact_phone: employee?.emergency_contact_phone || '',
    emergency_contact_relationship: employee?.emergency_contact_relationship || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Update profile
      await updateProfile(userId, {
        full_name: formData.full_name,
        phone: formData.phone,
      })

      // Update employee info
      await updateEmployeeInfo(userId, {
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        blood_group: formData.blood_group || null,
        marital_status: formData.marital_status || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postal_code || null,
        country: formData.country || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        emergency_contact_relationship: formData.emergency_contact_relationship || null,
      })

      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-50 dark:bg-gray-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee_id">Employee ID</Label>
            <Input
              id="employee_id"
              name="employee_id"
              value={formData.employee_id}
              disabled
              className="bg-gray-50 dark:bg-gray-900"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={`flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 ${isFormDisabled ? 'bg-gray-50 dark:bg-gray-900 cursor-not-allowed' : ''}`}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="blood_group">Blood Group</Label>
            <select
              id="blood_group"
              name="blood_group"
              value={formData.blood_group}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={`flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 ${isFormDisabled ? 'bg-gray-50 dark:bg-gray-900 cursor-not-allowed' : ''}`}
            >
              <option value="">Select blood group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="marital_status">Marital Status</Label>
            <select
              id="marital_status"
              name="marital_status"
              value={formData.marital_status}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={`flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 ${isFormDisabled ? 'bg-gray-50 dark:bg-gray-900 cursor-not-allowed' : ''}`}
            >
              <option value="">Select status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Contact Name</Label>
            <Input
              id="emergency_contact_name"
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
            <Input
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="emergency_contact_relationship">Relationship</Label>
            <Input
              id="emergency_contact_relationship"
              name="emergency_contact_relationship"
              value={formData.emergency_contact_relationship}
              onChange={handleChange}
              disabled={isFormDisabled}
              className={isFormDisabled ? "bg-gray-50 dark:bg-gray-900" : ""}
              placeholder="e.g., Spouse, Parent, Sibling"
            />
          </div>
        </CardContent>
      </Card>

      {!isFormDisabled && (
        <div className="flex justify-end">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  )
}
