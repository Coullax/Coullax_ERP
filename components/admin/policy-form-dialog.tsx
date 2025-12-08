'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createPolicy, updatePolicy } from '@/app/actions/policy-actions'
import { X } from 'lucide-react'

interface PolicyFormDialogProps {
    onClose: () => void
    onSuccess: () => void
    policy?: any
}

export function PolicyFormDialog({ onClose, onSuccess, policy }: PolicyFormDialogProps) {
    const isEdit = !!policy
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: policy?.name || '',
        policy_type: policy?.policy_type || '5_day_permanent',
        working_days_per_week: policy?.working_days_per_week || 5,
        leave_days_per_month: policy?.leave_days_per_month || 2,
        carry_forward_enabled: policy?.carry_forward_enabled ?? true,
        description: policy?.description || '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isEdit) {
                await updatePolicy(policy.id, formData)
                toast.success('Policy updated successfully!')
            } else {
                await createPolicy(formData as any)
                toast.success('Policy created successfully!')
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || `Failed to ${isEdit ? 'update' : 'create'} policy`)
        } finally {
            setLoading(false)
        }
    }

    const policyTypes = [
        { value: '5_day_permanent', label: '5 Day Workers - Permanent' },
        { value: '6_day_permanent', label: '6 Day Workers - Permanent' },
        { value: 'intern', label: 'Interns' },
        { value: 'contract', label: 'Contract Workers' },
    ]

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{isEdit ? 'Edit Policy' : 'Create New Policy'}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Policy Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g., 5 Day Workers - Permanent"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="policy_type">Policy Type *</Label>
                            <select
                                id="policy_type"
                                value={formData.policy_type}
                                onChange={(e) => setFormData({ ...formData, policy_type: e.target.value as any })}
                                required
                                className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                            >
                                {policyTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="working_days">Working Days Per Week *</Label>
                                <Input
                                    id="working_days"
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={formData.working_days_per_week}
                                    onChange={(e) => setFormData({ ...formData, working_days_per_week: parseInt(e.target.value) || 0 })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="leave_days">Leave Days Per Month *</Label>
                                <Input
                                    id="leave_days"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={formData.leave_days_per_month}
                                    onChange={(e) => setFormData({ ...formData, leave_days_per_month: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    id="carry_forward"
                                    type="checkbox"
                                    checked={formData.carry_forward_enabled}
                                    onChange={(e) => setFormData({ ...formData, carry_forward_enabled: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <Label htmlFor="carry_forward" className="cursor-pointer">
                                    Enable Carry Forward (unused leaves carry to next month)
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Additional details about this policy..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : isEdit ? 'Update Policy' : 'Create Policy'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
