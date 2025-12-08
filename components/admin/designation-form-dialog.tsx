'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createDesignation, updateDesignation } from '@/app/actions/designation-actions'
import { X } from 'lucide-react'

interface DesignationFormDialogProps {
    designation?: any
    onClose: () => void
    departments: any[]
    mode: 'create' | 'edit'
}

export function DesignationFormDialog({
    designation,
    onClose,
    departments,
    mode,
}: DesignationFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: designation?.title || '',
        description: designation?.description || '',
        department_id: designation?.department?.id || '',
        level: designation?.level || 1,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (mode === 'create') {
                await createDesignation({
                    title: formData.title,
                    description: formData.description || undefined,
                    department_id: formData.department_id || undefined,
                    level: formData.level,
                })
                toast.success('Designation created successfully!')
            } else {
                await updateDesignation(designation.id, {
                    title: formData.title,
                    description: formData.description,
                    department_id: formData.department_id || null,
                    level: formData.level,
                })
                toast.success('Designation updated successfully!')
            }
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || `Failed to ${mode} designation`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{mode === 'create' ? 'Create' : 'Edit'} Designation</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                placeholder="e.g., Senior Developer"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the designation"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <select
                                id="department"
                                value={formData.department_id}
                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                            >
                                <option value="">No Department</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="level">Level</Label>
                            <Input
                                id="level"
                                type="number"
                                min="1"
                                max="10"
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                                required
                            />
                            <p className="text-xs text-gray-500">Hierarchy level (1-10, where 1 is entry level)</p>
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create' : 'Update')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
