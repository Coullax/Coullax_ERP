'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { deleteDesignation } from '@/app/actions/designation-actions'
import { Plus, Edit, Trash2, Users, Briefcase, Building2, Award } from 'lucide-react'
import { DesignationFormDialog } from '@/components/admin/designation-form-dialog'
import { EmployeesByDesignationDialog } from '@/components/admin/employees-by-designation-dialog'
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

interface DesignationsPageClientProps {
    designations: any[]
    departments: any[]
}

export function DesignationsPageClient({
    designations,
    departments,
}: DesignationsPageClientProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const [filter, setFilter] = useState<string>('all')
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editingDesignation, setEditingDesignation] = useState<any | null>(null)
    const [viewingEmployees, setViewingEmployees] = useState<any | null>(null)
    const [deletingDesignation, setDeletingDesignation] = useState<any | null>(null)

    const filteredDesignations =
        filter === 'all'
            ? designations
            : filter === 'no_dept'
                ? designations.filter((d) => !d.department)
                : designations.filter((d) => d.department?.id === filter)

    const handleDelete = async () => {
        if (!deletingDesignation) return

        setLoading(deletingDesignation.id)
        try {
            await deleteDesignation(deletingDesignation.id)
            toast.success('Designation deleted successfully!')
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete designation')
        } finally {
            setLoading(null)
            setDeletingDesignation(null)
        }
    }

    const stats = {
        total: designations.length,
        totalEmployees: designations.reduce((sum, d) => sum + (d.employee_count || 0), 0),
        byDepartment: departments.map((dept) => ({
            ...dept,
            count: designations.filter((d) => d.department?.id === dept.id).length,
        })),
        noDepartment: designations.filter((d) => !d.department).length,
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Designations</h1>
                    <p className="text-gray-500 mt-1">Manage job titles and designations</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Designation
                </Button>
            </div>

            {/* Create Dialog */}
            {showCreateDialog && (
                <DesignationFormDialog
                    mode="create"
                    onClose={() => setShowCreateDialog(false)}
                    departments={departments}
                />
            )}

            {/* Edit Dialog */}
            {editingDesignation && (
                <DesignationFormDialog
                    mode="edit"
                    designation={editingDesignation}
                    onClose={() => setEditingDesignation(null)}
                    departments={departments}
                />
            )}

            {/* View Employees Dialog */}
            {viewingEmployees && (
                <EmployeesByDesignationDialog
                    designation={viewingEmployees}
                    onClose={() => setViewingEmployees(null)}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingDesignation} onOpenChange={() => setDeletingDesignation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Designation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deletingDesignation?.title}&quot;? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Designations</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <Briefcase className="w-8 h-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Employees</p>
                                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Departments</p>
                                <p className="text-2xl font-bold">{departments.length}</p>
                            </div>
                            <Building2 className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilter('all')}
                >
                    All ({designations.length})
                </Button>
                {departments.map((dept) => {
                    const count = designations.filter((d) => d.department?.id === dept.id).length
                    return (
                        <Button
                            key={dept.id}
                            variant={filter === dept.id ? 'default' : 'outline'}
                            onClick={() => setFilter(dept.id)}
                        >
                            {dept.name} ({count})
                        </Button>
                    )
                })}
                {stats.noDepartment > 0 && (
                    <Button
                        variant={filter === 'no_dept' ? 'default' : 'outline'}
                        onClick={() => setFilter('no_dept')}
                    >
                        No Department ({stats.noDepartment})
                    </Button>
                )}
            </div>

            {/* Designations List */}
            <Card>
                <CardHeader>
                    <CardTitle>Designations ({filteredDesignations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredDesignations.length === 0 ? (
                            <div className="text-center py-12">
                                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">No designations found.</p>
                                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                                    Create First Designation
                                </Button>
                            </div>
                        ) : (
                            filteredDesignations.map((designation) => (
                                <div
                                    key={designation.id}
                                    className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold">{designation.title}</h3>
                                                <Badge variant="outline">Level {designation.level}</Badge>
                                            </div>
                                            {designation.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                    {designation.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                {designation.department ? (
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="w-4 h-4" />
                                                        <span>{designation.department.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="w-4 h-4" />
                                                        <span className="italic">No Department</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => setViewingEmployees(designation)}
                                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                                >
                                                    <Users className="w-4 h-4" />
                                                    <span>
                                                        {designation.employee_count || 0} employee
                                                        {designation.employee_count !== 1 ? 's' : ''}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingDesignation(designation)}
                                                disabled={loading === designation.id}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setDeletingDesignation(designation)}
                                                disabled={loading === designation.id}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
