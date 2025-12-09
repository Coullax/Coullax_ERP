'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from '@/components/ui/pagination'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Shield, Users, Key, Plus, Edit, Trash2, Eye, MoreHorizontal, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { deleteRole } from '@/app/actions/role-actions'
import { RoleFormDialog } from '@/components/admin/role-form-dialog'
import { RolePermissionsDialog } from '@/components/admin/role-permissions-dialog'
import { RoleUsersDialog } from '@/components/admin/role-users-dialog'
import { RoleDetailsDialog } from '@/components/admin/role-details-dialog'

interface RolesPageClientProps {
    roles: any[]
    permissions: any[]
    groupedPermissions: Record<string, any[]>
    users: any[]
}

export function RolesPageClient({
    roles,
    permissions,
    groupedPermissions,
    users,
}: RolesPageClientProps) {
    const [filter, setFilter] = useState<string>('all')
    const [offset, setOffset] = useState(0)
    const [loading, setLoading] = useState(false)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editingRole, setEditingRole] = useState<any | null>(null)
    const [managingPermissions, setManagingPermissions] = useState<any | null>(null)
    const [managingUsers, setManagingUsers] = useState<any | null>(null)
    const [viewingRole, setViewingRole] = useState<any | null>(null)
    const [deletingRole, setDeletingRole] = useState<any | null>(null)
    const limit = 10

    const filteredRoles =
        filter === 'all'
            ? roles
            : filter === 'system'
                ? roles.filter((r) => r.is_system_role)
                : roles.filter((r) => !r.is_system_role)

    // Pagination calculations
    const paginatedRoles = filteredRoles.slice(offset, offset + limit)
    const totalPages = Math.ceil(filteredRoles.length / limit)
    const currentPage = Math.floor(offset / limit) + 1

    // Reset to page 1 when filter changes
    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter)
        setOffset(0)
    }

    const handleDelete = async () => {
        if (!deletingRole) return

        setLoading(true)
        try {
            await deleteRole(deletingRole.id)
            toast.success('Role deleted successfully!')
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete role')
        } finally {
            setLoading(false)
            setDeletingRole(null)
        }
    }

    const stats = {
        total: roles.length,
        system: roles.filter((r) => r.is_system_role).length,
        custom: roles.filter((r) => !r.is_system_role).length,
        totalPermissions: permissions.length,
        usersWithCustomRoles: roles.reduce((sum, r) => sum + (r.is_system_role ? 0 : r.user_count), 0),
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Roles & Permissions</h1>
                    <p className="text-gray-500 mt-1">
                        Create custom roles, assign permissions, and manage role hierarchy
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Role
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Roles</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <Shield className="w-8 h-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Custom Roles</p>
                                <p className="text-2xl font-bold">{stats.custom}</p>
                            </div>
                            <Shield className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Permissions</p>
                                <p className="text-2xl font-bold">{stats.totalPermissions}</p>
                            </div>
                            <Key className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Users With Custom Roles</p>
                                <p className="text-2xl font-bold">{stats.usersWithCustomRoles}</p>
                            </div>
                            <Users className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'system', label: 'System Roles' },
                    { value: 'custom', label: 'Custom Roles' },
                ].map((status) => (
                    <Button
                        key={status.value}
                        variant={filter === status.value ? 'default' : 'outline'}
                        onClick={() => handleFilterChange(status.value)}
                        className="capitalize"
                    >
                        {status.label}
                    </Button>
                ))}
            </div>

            {/* Roles Table */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center justify-between text-lg">
                        <span>Roles</span>
                        <span className="text-sm font-normal text-gray-500">
                            Showing {Math.min(offset + limit, filteredRoles.length)} of {filteredRoles.length}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredRoles.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No roles found</p>
                            {filter !== 'all' && <p className="text-sm mt-2">Try adjusting your filters</p>}
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Role Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Permissions</TableHead>
                                        <TableHead>Users</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRoles.map((role) => (
                                        <TableRow key={role.id}>
                                            {/* Role Name */}
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                                                        <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{role.name}</div>
                                                        {role.description && (
                                                            <div className="text-sm text-gray-500">{role.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Type */}
                                            <TableCell>
                                                {role.is_system_role ? (
                                                    <Badge variant="default">System</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Custom</Badge>
                                                )}
                                            </TableCell>

                                            {/* Permissions Count */}
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Key className="w-4 h-4 text-gray-400" />
                                                    <span>{role.permission_count} permissions</span>
                                                </div>
                                            </TableCell>

                                            {/* Users Count */}
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                    <span>{role.user_count} users</span>
                                                </div>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setViewingRole(role)}>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setEditingRole(role)}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit Role
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setManagingPermissions(role)}>
                                                            <Key className="w-4 h-4 mr-2" />
                                                            Manage Permissions
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setManagingUsers(role)}>
                                                            <UserCog className="w-4 h-4 mr-2" />
                                                            Manage Users
                                                        </DropdownMenuItem>
                                                        {!role.is_system_role && (
                                                            <DropdownMenuItem
                                                                onClick={() => setDeletingRole(role)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-6 border-t pt-4">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        setOffset(Math.max(0, offset - limit))
                                                    }}
                                                    className={offset === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>

                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter((page) => {
                                                    return (
                                                        page === 1 ||
                                                        page === totalPages ||
                                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                                    )
                                                })
                                                .map((page, index, array) => (
                                                    <span key={page}>
                                                        {index > 0 && array[index - 1] !== page - 1 && (
                                                            <PaginationItem>
                                                                <PaginationEllipsis />
                                                            </PaginationItem>
                                                        )}
                                                        <PaginationItem>
                                                            <PaginationLink
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    setOffset((page - 1) * limit)
                                                                }}
                                                                isActive={currentPage === page}
                                                                className="cursor-pointer"
                                                            >
                                                                {page}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    </span>
                                                ))}

                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        setOffset(Math.min((totalPages - 1) * limit, offset + limit))
                                                    }}
                                                    className={
                                                        offset + limit >= filteredRoles.length
                                                            ? 'pointer-events-none opacity-50'
                                                            : 'cursor-pointer'
                                                    }
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            {showCreateDialog && (
                <RoleFormDialog mode="create" onClose={() => setShowCreateDialog(false)} />
            )}

            {editingRole && (
                <RoleFormDialog mode="edit" role={editingRole} onClose={() => setEditingRole(null)} />
            )}

            {managingPermissions && (
                <RolePermissionsDialog
                    role={managingPermissions}
                    permissions={permissions}
                    groupedPermissions={groupedPermissions}
                    onClose={() => setManagingPermissions(null)}
                />
            )}

            {managingUsers && (
                <RoleUsersDialog
                    role={managingUsers}
                    users={users}
                    onClose={() => setManagingUsers(null)}
                />
            )}

            {viewingRole && (
                <RoleDetailsDialog role={viewingRole} onClose={() => setViewingRole(null)} />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Role</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deletingRole?.name}&quot;? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={loading}
                        >
                            {loading ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
