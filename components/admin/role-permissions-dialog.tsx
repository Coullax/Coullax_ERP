'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Search } from 'lucide-react'
import { toast } from 'sonner'
import { assignPermissionsToRole, getRoleById } from '@/app/actions/role-actions'

interface RolePermissionsDialogProps {
    role: any
    permissions: any[]
    groupedPermissions: Record<string, any[]>
    onClose: () => void
}

export function RolePermissionsDialog({
    role,
    permissions,
    groupedPermissions,
    onClose,
}: RolePermissionsDialogProps) {
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

    useEffect(() => {
        // Load existing permissions for this role
        const loadPermissions = async () => {
            try {
                const roleData = await getRoleById(role.id)
                const permissionIds = roleData.permissions.map((p: any) => p.id)
                setSelectedPermissions(new Set(permissionIds))
            } catch (error) {
                console.error('Failed to load permissions:', error)
            }
        }
        loadPermissions()
    }, [role.id])

    const handleTogglePermission = (permissionId: string) => {
        const newSelected = new Set(selectedPermissions)
        if (newSelected.has(permissionId)) {
            newSelected.delete(permissionId)
        } else {
            newSelected.add(permissionId)
        }
        setSelectedPermissions(newSelected)
    }

    const handleToggleGroup = (groupPermissions: any[]) => {
        const groupIds = groupPermissions.map((p) => p.id)
        const allSelected = groupIds.every((id) => selectedPermissions.has(id))
        const newSelected = new Set(selectedPermissions)

        if (allSelected) {
            groupIds.forEach((id) => newSelected.delete(id))
        } else {
            groupIds.forEach((id) => newSelected.add(id))
        }

        setSelectedPermissions(newSelected)
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            await assignPermissionsToRole(role.id, Array.from(selectedPermissions))
            toast.success('Permissions updated successfully!')
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || 'Failed to update permissions')
        } finally {
            setLoading(false)
        }
    }

    // Filter permissions by search query
    const filteredGroups = Object.entries(groupedPermissions).reduce(
        (acc, [resource, perms]) => {
            const filtered = perms.filter(
                (p) =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            if (filtered.length > 0) {
                acc[resource] = filtered
            }
            return acc
        },
        {} as Record<string, any[]>
    )

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                    <div>
                        <CardTitle>Manage Permissions</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            Configure permissions for &quot;{role.name}&quot;
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-6">
                    {/* Search */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search permissions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm">
                            <span className="font-medium">{selectedPermissions.size}</span> of{' '}
                            <span className="font-medium">{permissions.length}</span> permissions selected
                        </p>
                    </div>

                    {/* Permissions by Resource */}
                    <div className="space-y-6">
                        {Object.entries(filteredGroups).map(([resource, resourcePermissions]) => {
                            const allSelected = resourcePermissions.every((p) =>
                                selectedPermissions.has(p.id)
                            )
                            const someSelected = resourcePermissions.some((p) =>
                                selectedPermissions.has(p.id)
                            )

                            return (
                                <div key={resource} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold capitalize">{resource}</h3>
                                            <Badge variant="outline">{resourcePermissions.length}</Badge>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleGroup(resourcePermissions)}
                                        >
                                            {allSelected ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {resourcePermissions.map((permission) => (
                                            <div
                                                key={permission.id}
                                                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <Checkbox
                                                    id={permission.id}
                                                    checked={selectedPermissions.has(permission.id)}
                                                    onCheckedChange={() => handleTogglePermission(permission.id)}
                                                />
                                                <Label
                                                    htmlFor={permission.id}
                                                    className="flex-1 cursor-pointer text-sm"
                                                >
                                                    <div className="font-medium">{permission.description}</div>
                                                    <div className="text-xs text-gray-500">{permission.name}</div>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {Object.keys(filteredGroups).length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p>No permissions found matching &quot;{searchQuery}&quot;</p>
                        </div>
                    )}
                </CardContent>

                <div className="border-t p-6 flex gap-2 justify-end">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Permissions'}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
