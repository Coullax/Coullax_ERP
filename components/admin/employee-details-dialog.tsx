'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Mail, Phone, Calendar, Building2, Briefcase, MapPin, User, Shield, Heart, Droplet } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'

interface EmployeeDetailsDialogProps {
    employee: any
    onClose: () => void
}

export function EmployeeDetailsDialog({
    employee,
    onClose,
}: EmployeeDetailsDialogProps) {
    const getRoleBadge = (role: string) => {
        const variants: Record<string, any> = {
            employee: { variant: 'secondary', label: 'Employee' },
            admin: { variant: 'default', label: 'Admin' },
            super_admin: { variant: 'destructive', label: 'Super Admin' },
        }
        const config = variants[role] || { variant: 'secondary', label: role }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white dark:bg-gray-950 z-10 border-b">
                    <CardTitle>Employee Details</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Profile Section */}
                    <div className="flex items-start gap-6">
                        <Avatar className="w-24 h-24">
                            <AvatarImage src={employee.profile?.avatar_url} />
                            <AvatarFallback className="text-2xl">
                                {employee.profile ? getInitials(employee.profile.full_name) : 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-2">
                                {employee.profile?.full_name || 'Unknown'}
                            </h2>
                            <div className="flex items-center gap-2 mb-3">
                                {getRoleBadge(employee.profile?.role || 'employee')}
                                <Badge variant="outline">ID: {employee.employee_id}</Badge>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    <span>{employee.profile?.email}</span>
                                </div>
                                {employee.profile?.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{employee.profile.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Work Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Work Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm text-gray-500">Department</label>
                                <div className="flex items-center gap-2 text-sm">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span>{employee.department?.name || 'Not assigned'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-gray-500">Designation</label>
                                <div className="flex items-center gap-2 text-sm">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    <span>{employee.designation?.title || 'Not assigned'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-gray-500">Joining Date</label>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>{formatDate(employee.joining_date)}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-gray-500">Employee ID</label>
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span>{employee.employee_id}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-gray-500">Employee No</label>
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span>{employee.employee_no || 'Not assigned'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    {(employee.date_of_birth || employee.gender || employee.blood_group || employee.marital_status) && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Personal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {employee.date_of_birth && (
                                    <div className="space-y-1">
                                        <label className="text-sm text-gray-500">Date of Birth</label>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>{formatDate(employee.date_of_birth)}</span>
                                        </div>
                                    </div>
                                )}
                                {employee.gender && (
                                    <div className="space-y-1">
                                        <label className="text-sm text-gray-500">Gender</label>
                                        <div className="flex items-center gap-2 text-sm capitalize">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span>{employee.gender}</span>
                                        </div>
                                    </div>
                                )}
                                {employee.blood_group && (
                                    <div className="space-y-1">
                                        <label className="text-sm text-gray-500">Blood Group</label>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Droplet className="w-4 h-4 text-gray-400" />
                                            <span>{employee.blood_group}</span>
                                        </div>
                                    </div>
                                )}
                                {employee.marital_status && (
                                    <div className="space-y-1">
                                        <label className="text-sm text-gray-500">Marital Status</label>
                                        <div className="flex items-center gap-2 text-sm capitalize">
                                            <Heart className="w-4 h-4 text-gray-400" />
                                            <span>{employee.marital_status}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Address Information */}
                    {(employee.address || employee.city || employee.state) && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Address
                            </h3>
                            <div className="space-y-2 text-sm">
                                {employee.address && <p>{employee.address}</p>}
                                <p>
                                    {[employee.city, employee.state, employee.postal_code, employee.country]
                                        .filter(Boolean)
                                        .join(', ')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Emergency Contact */}
                    {employee.emergency_contact_name && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Emergency Contact
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-gray-500">Contact Name</label>
                                    <div className="text-sm">{employee.emergency_contact_name}</div>
                                </div>
                                {employee.emergency_contact_phone && (
                                    <div className="space-y-1">
                                        <label className="text-sm text-gray-500">Contact Phone</label>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span>{employee.emergency_contact_phone}</span>
                                        </div>
                                    </div>
                                )}
                                {employee.emergency_contact_relationship && (
                                    <div className="space-y-1">
                                        <label className="text-sm text-gray-500">Relationship</label>
                                        <div className="text-sm capitalize">{employee.emergency_contact_relationship}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Leave Policy */}
                    {employee.policy_id && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Leave Policy
                            </h3>
                            <div className="space-y-2 text-sm">
                                <p>Policy assigned on: {employee.policy_assigned_date ? formatDate(employee.policy_assigned_date) : 'N/A'}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
