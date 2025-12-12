'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function PasswordResetForm() {
    const [loading, setLoading] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (formData.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters long')
            return
        }

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        if (formData.currentPassword === formData.newPassword) {
            toast.error('New password must be different from current password')
            return
        }

        setLoading(true)

        try {
            const supabase = createClient()

            // Update password
            const { error } = await supabase.auth.updateUser({
                password: formData.newPassword
            })

            if (error) throw error

            toast.success('Password updated successfully!')

            // Reset form
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            })
        } catch (error: any) {
            console.error('Password update error:', error)
            toast.error(error.message || 'Failed to update password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    <CardTitle>Change Password</CardTitle>
                </div>
                <CardDescription>
                    Update your password to keep your account secure
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                required
                                placeholder="Enter your current password"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showCurrentPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? 'text' : 'password'}
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                required
                                placeholder="Enter your new password"
                                minLength={6}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showNewPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Password must be at least 6 characters long
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                placeholder="Confirm your new password"
                                minLength={6}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFormData({
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: '',
                            })}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
