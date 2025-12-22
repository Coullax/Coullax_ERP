'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateProfile, updateEmployeeInfo, verifyEmployeeProfile } from '@/app/actions/profile-actions'
import { CheckCircle, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

interface BasicInfoFormAdminProps {
    userId: string
    profile: any
    employee: any
}

export function BasicInfoFormAdmin({ userId, profile, employee }: BasicInfoFormAdminProps) {
    const user = useAuthStore((state) => state.user)
    const [loading, setLoading] = useState(false)
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

        // EPF/ETF data
        members_no: employee?.members_no || '',
        date_employed_from: employee?.date_employed_from || '',
        name_with_initials: employee?.name_with_initials || '',
        other_names: employee?.other_names || '',
        nationality: employee?.nationality || '',
        place_of_birth: employee?.place_of_birth || '',
        name_of_spouse: employee?.name_of_spouse || '',
        nic: employee?.nic || '',
        name_of_father: employee?.name_of_father || '',
        name_of_mother: employee?.name_of_mother || '',

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

    const isVerified = employee?.isverified || false

    // Calculate age from date of birth
    const calculateAge = (dateOfBirth: string): string => {
        if (!dateOfBirth) return ''
        const today = new Date()
        const birthDate = new Date(dateOfBirth)
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age.toString()
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            console.log('Starting profile verification for user:', userId)

            // Update profile
            await updateProfile(userId, {
                full_name: formData.full_name,
                phone: formData.phone,
            })
            console.log('Profile updated successfully')

            // Update employee info
            await updateEmployeeInfo(userId, {
                date_of_birth: formData.date_of_birth || null,
                gender: formData.gender || null,
                blood_group: formData.blood_group || null,
                marital_status: formData.marital_status || null,
                members_no: formData.members_no || null,
                date_employed_from: formData.date_employed_from || null,
                name_with_initials: formData.name_with_initials || null,
                other_names: formData.other_names || null,
                nationality: formData.nationality || null,
                place_of_birth: formData.place_of_birth || null,
                name_of_spouse: formData.name_of_spouse || null,
                nic: formData.nic || null,
                name_of_father: formData.name_of_father || null,
                name_of_mother: formData.name_of_mother || null,
                address: formData.address || null,
                city: formData.city || null,
                state: formData.state || null,
                postal_code: formData.postal_code || null,
                country: formData.country || null,
                emergency_contact_name: formData.emergency_contact_name || null,
                emergency_contact_phone: formData.emergency_contact_phone || null,
                emergency_contact_relationship: formData.emergency_contact_relationship || null,
            })
            console.log('Employee info updated successfully')

            // Verify the employee profile
            if (user?.id) {
                console.log('Calling verifyEmployeeProfile with:', { userId, adminId: user.id })
                await verifyEmployeeProfile(userId, user.id)
                console.log('Verification completed successfully')
            } else {
                console.error('No user ID found in auth store')
                throw new Error('Admin user ID not found')
            }

            toast.success('Basic info verified and updated successfully!')
        } catch (error: any) {
            console.error('Verification failed:', error)
            toast.error(error.message || 'Failed to verify basic info')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleVerify} className="space-y-6">
            {/* Verification Status Badge */}
            {isVerified && (
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                        <div>
                            <p className="font-semibold text-green-900 dark:text-green-100">Profile Verified</p>
                            {employee?.verified_at && (
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Verified on {new Date(employee.verified_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
            )}

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
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <select
                            id="gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
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
                            className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
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
                            className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
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

            {/* EPF/ETF Information */}
            <Card>
                <CardHeader>
                    <CardTitle>EPF/ETF</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="members_no">Members No</Label>
                        <Input
                            id="members_no"
                            name="members_no"
                            value={formData.members_no}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date_employed_from">Date Employed From</Label>
                        <Input
                            id="date_employed_from"
                            name="date_employed_from"
                            type="date"
                            value={formData.date_employed_from}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name_with_initials">Name with Initials</Label>
                        <Input
                            id="name_with_initials"
                            name="name_with_initials"
                            value={formData.name_with_initials}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="other_names">Other Names</Label>
                        <Input
                            id="other_names"
                            name="other_names"
                            value={formData.other_names}
                            onChange={handleChange}
                            placeholder="Optional"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nationality">Nationality</Label>
                        <Input
                            id="nationality"
                            name="nationality"
                            value={formData.nationality}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input
                            id="age"
                            name="age"
                            value={calculateAge(formData.date_of_birth)}
                            disabled
                            className="bg-gray-50 dark:bg-gray-900"
                            placeholder="Calculated from date of birth"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="place_of_birth">Place of Birth</Label>
                        <Input
                            id="place_of_birth"
                            name="place_of_birth"
                            value={formData.place_of_birth}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name_of_spouse">Name of Spouse</Label>
                        <Input
                            id="name_of_spouse"
                            name="name_of_spouse"
                            value={formData.name_of_spouse}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nic">NIC</Label>
                        <Input
                            id="nic"
                            name="nic"
                            value={formData.nic}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name_of_father">Name of Father</Label>
                        <Input
                            id="name_of_father"
                            name="name_of_father"
                            value={formData.name_of_father}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name_of_mother">Name of Mother</Label>
                        <Input
                            id="name_of_mother"
                            name="name_of_mother"
                            value={formData.name_of_mother}
                            onChange={handleChange}
                        />
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
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                            id="state"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="postal_code">Postal Code</Label>
                        <Input
                            id="postal_code"
                            name="postal_code"
                            value={formData.postal_code}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
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
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                        <Input
                            id="emergency_contact_relationship"
                            name="emergency_contact_relationship"
                            value={formData.emergency_contact_relationship}
                            onChange={handleChange}
                            placeholder="e.g., Spouse, Parent, Sibling"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={loading}
                    size="lg"
                    className={isVerified
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-green-600 hover:bg-green-700"
                    }
                >
                    {loading ? (
                        isVerified ? 'Re-verifying...' : 'Verifying...'
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {isVerified ? 'Update & Re-verify Basic Info' : 'save & Verify Basic Info'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
