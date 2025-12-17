'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateEmployee } from '@/app/actions/employee-actions'
import { X } from 'lucide-react'

interface EditEmployeeDialogProps {
    employee: any
    onClose: () => void
    departments: any[]
    designations: any[]
    policies: any[]
}

export function EditEmployeeDialog({
    employee,
    onClose,
    departments,
    designations,
    policies,
}: EditEmployeeDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        full_name: employee.profile?.full_name || '',
        email: employee.profile?.email || '',
        role: employee.profile?.role || 'employee' as 'employee' | 'admin' | 'super_admin',
        phone: employee.profile?.phone || '',
        department_id: employee.department?.id || '',
        designation_id: employee.designation?.id || '',
        policy_id: employee.policy_id || '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await updateEmployee(employee.id, {
                full_name: formData.full_name,
                email: formData.email,
                role: formData.role,
                phone: formData.phone || undefined,
                department_id: formData.department_id || null,
                designation_id: formData.designation_id || null,
                policy_id: formData.policy_id || null,
            })
            toast.success('Employee updated successfully!')
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || 'Failed to update employee')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Edit Employee</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    placeholder="john@company.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1234567890"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role *</Label>
                                <select
                                    id="role"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    required
                                    className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Team</Label>
                                <select
                                    id="department"
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                    className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <option value="">Select Department</option>
                                    {departments.filter(dept => dept.parent_id).map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="designation">Designation</Label>
                                <select
                                    id="designation"
                                    value={formData.designation_id}
                                    onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                                    className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <option value="">Select Designation</option>
                                    {designations.map((desig) => (
                                        <option key={desig.id} value={desig.id}>
                                            {desig.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="policy">Leave Policy</Label>
                                <select
                                    id="policy"
                                    value={formData.policy_id}
                                    onChange={(e) => setFormData({ ...formData, policy_id: e.target.value })}
                                    className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                                >
                                    <option value="">No Policy</option>
                                    {policies.map((policy) => (
                                        <option key={policy.id} value={policy.id}>
                                            {policy.name} ({policy.leave_days_per_month} days/month)
                                        </option>
                                    ))}
                                </select>
                                {employee.policy_id && employee.policy_assigned_date && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Current policy assigned on: {new Date(employee.policy_assigned_date).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Updating...' : 'Update Employee'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
