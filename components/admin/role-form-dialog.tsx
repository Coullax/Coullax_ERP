'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createRole, updateRole } from '@/app/actions/role-actions'

interface RoleFormDialogProps {
    mode: 'create' | 'edit'
    role?: any
    onClose: () => void
}

export function RoleFormDialog({ mode, role, onClose }: RoleFormDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: role?.name || '',
        description: role?.description || '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (mode === 'create') {
                await createRole(formData)
                toast.success('Role created successfully!')
            } else {
                await updateRole(role.id, formData)
                toast.success('Role updated successfully!')
            }
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || 'Operation failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{mode === 'create' ? 'Create' : 'Edit'} Role</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Role Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g., HR Manager"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe what this role does..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
