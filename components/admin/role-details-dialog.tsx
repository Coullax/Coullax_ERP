'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Key, Users } from 'lucide-react'
import { getRoleById } from '@/app/actions/role-actions'
import { getInitials, formatDate } from '@/lib/utils'

interface RoleDetailsDialogProps {
    role: any
    onClose: () => void
}

export function RoleDetailsDialog({ role, onClose }: RoleDetailsDialogProps) {
    const [roleDetails, setRoleDetails] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadRoleDetails = async () => {
            try {
                const data = await getRoleById(role.id)
                setRoleDetails(data)
            } catch (error) {
                console.error('Failed to load role details:', error)
            } finally {
                setLoading(false)
            }
        }
        loadRoleDetails()
    }, [role.id])

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-3xl">
                    <CardContent className="p-12 text-center">
                        <p className="text-gray-500">Loading...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Group permissions by resource
    const groupedPermissions = roleDetails?.permissions?.reduce((acc: any, perm: any) => {
        if (!acc[perm.resource]) {
            acc[perm.resource] = []
        }
        acc[perm.resource].push(perm)
        return acc
    }, {}) || {}

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                    <div>
                        <CardTitle>Role Details</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">View role information and assignments</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Role Info */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-xl font-semibold">{roleDetails?.name}</h3>
                                {roleDetails?.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {roleDetails.description}
                                    </p>
                                )}
                            </div>
                            {roleDetails?.is_system_role ? (
                                <Badge variant="default">System Role</Badge>
                            ) : (
                                <Badge variant="secondary">Custom Role</Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                            <div>
                                <p className="text-gray-500">Created</p>
                                <p className="font-medium">{formatDate(roleDetails?.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Last Updated</p>
                                <p className="font-medium">{formatDate(roleDetails?.updated_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Permissions */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Permissions ({roleDetails?.permissions?.length || 0})
                        </h3>

                        {roleDetails?.permissions?.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No permissions assigned to this role</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupedPermissions).map(([resource, perms]: [string, any]) => (
                                    <div key={resource} className="border rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <h4 className="font-medium capitalize">{resource}</h4>
                                            <Badge variant="outline">{perms.length}</Badge>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {perms.map((perm: any) => (
                                                <div
                                                    key={perm.id}
                                                    className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                                >
                                                    <div className="font-medium">{perm.description}</div>
                                                    <div className="text-xs text-gray-500">{perm.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Users */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Users with this role ({roleDetails?.users?.length || 0})
                        </h3>

                        {roleDetails?.users?.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No users assigned to this role</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {roleDetails.users.map((user: any) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-3 border rounded-lg"
                                    >
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={user.avatar_url} />
                                            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="font-medium">{user.full_name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>

                <div className="border-t p-6 flex gap-2 justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </Card>
        </div>
    )
}
