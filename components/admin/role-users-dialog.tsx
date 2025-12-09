'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { X, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
    getUsersByRole,
    assignRoleToUser,
    removeRoleFromUser,
} from '@/app/actions/role-actions'
import { getInitials } from '@/lib/utils'

interface RoleUsersDialogProps {
    role: any
    users: any[]
    onClose: () => void
}

export function RoleUsersDialog({ role, users, onClose }: RoleUsersDialogProps) {
    const [loading, setLoading] = useState(false)
    const [roleUsers, setRoleUsers] = useState<any[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string>('')

    useEffect(() => {
        loadUsers()
    }, [role.id])

    const loadUsers = async () => {
        try {
            const data = await getUsersByRole(role.id)
            setRoleUsers(data)
        } catch (error) {
            console.error('Failed to load users:', error)
        }
    }

    const handleAddUser = async () => {
        if (!selectedUserId) return

        setLoading(true)
        try {
            await assignRoleToUser(selectedUserId, role.id)
            toast.success('User assigned to role successfully!')
            setSelectedUserId('')
            await loadUsers()
        } catch (error: any) {
            toast.error(error.message || 'Failed to assign user')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveUser = async (userId: string) => {
        if (!confirm('Remove this user from the role?')) return

        setLoading(true)
        try {
            await removeRoleFromUser(userId, role.id)
            toast.success('User removed from role successfully!')
            await loadUsers()
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove user')
        } finally {
            setLoading(false)
        }
    }

    // Filter out users already assigned to this role
    const availableUsers = users.filter(
        (user) => !roleUsers.some((ru) => ru.user?.id === user.id)
    )

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                    <div>
                        <CardTitle>Manage Users</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            Assign users to &quot;{role.name}&quot; role
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-6">
                    {/* Add User */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Assign User to Role
                        </h3>
                        <div className="flex gap-2">
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select a user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableUsers.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.full_name} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAddUser} disabled={!selectedUserId || loading}>
                                {loading ? 'Adding...' : 'Add User'}
                            </Button>
                        </div>
                    </div>

                    {/* Users List */}
                    <div>
                        <h3 className="font-medium mb-3">
                            Users with this role ({roleUsers.length})
                        </h3>

                        {roleUsers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>No users assigned to this role yet</p>
                                <p className="text-sm mt-1">Use the form above to assign users</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {roleUsers.map((roleUser) => {
                                    const user = roleUser.user
                                    if (!user) return null

                                    return (
                                        <div
                                            key={roleUser.id}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={user.avatar_url} />
                                                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium">{user.full_name}</div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                                        {user.email}
                                                        <Badge variant="outline" className="capitalize">
                                                            {user.role}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRemoveUser(user.id)}
                                                disabled={loading}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )
                                })}
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
