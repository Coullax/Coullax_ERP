'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getEmployeesByDesignation } from '@/app/actions/designation-actions'
import { X, Mail, Building2, Loader2 } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface EmployeesByDesignationDialogProps {
    designation: any
    onClose: () => void
}

export function EmployeesByDesignationDialog({
    designation,
    onClose,
}: EmployeesByDesignationDialogProps) {
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const data = await getEmployeesByDesignation(designation.id)
                setEmployees(data)
            } catch (error) {
                console.error('Failed to fetch employees:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchEmployees()
    }, [designation.id])

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Employees - {designation.title}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            {employees.length} employee{employees.length !== 1 ? 's' : ''} assigned
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No employees assigned to this designation yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {employees.map((employee) => (
                                <div
                                    key={employee.id}
                                    className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={employee.profile?.avatar_url} />
                                            <AvatarFallback>
                                                {employee.profile ? getInitials(employee.profile.full_name) : 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold truncate">
                                                {employee.profile?.full_name || 'Unknown'}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    <span className="truncate">{employee.profile?.email}</span>
                                                </div>
                                                {employee.department && (
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        <span>{employee.department.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
