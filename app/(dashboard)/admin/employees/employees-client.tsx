'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { updateEmployeeRole, updateEmployeeTeam } from '@/app/actions/employee-actions'
import { Users, Mail, Phone, Calendar, Building2, Briefcase, Plus } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { CreateEmployeeDialog } from '@/components/admin/create-employee-dialog'

interface EmployeesPageClientProps {
  employees: any[]
  departments: any[]
  designations: any[]
  currentUserId: string
}

export function EmployeesPageClient({
  employees,
  departments,
  designations,
  currentUserId,
}: EmployeesPageClientProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const filteredEmployees = filter === 'all'
    ? employees
    : employees.filter(emp => emp.profile?.role === filter)

  const handleRoleChange = async (employeeId: string, newRole: 'employee' | 'admin' | 'super_admin') => {
    if (employeeId === currentUserId) {
      toast.error("You cannot change your own role!")
      return
    }

    setLoading(employeeId)
    try {
      await updateEmployeeRole(employeeId, newRole)
      toast.success('Role updated successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    } finally {
      setLoading(null)
    }
  }

  const handleTeamUpdate = async (
    employeeId: string,
    field: 'department_id' | 'designation_id',
    value: string
  ) => {
    setLoading(employeeId)
    try {
      await updateEmployeeTeam(employeeId, {
        [field]: value || null,
      })
      toast.success('Team updated successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update team')
    } finally {
      setLoading(null)
    }
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      employee: { variant: 'secondary', label: 'Employee' },
      admin: { variant: 'default', label: 'Admin' },
      super_admin: { variant: 'destructive', label: 'Super Admin' },
    }
    const config = variants[role] || { variant: 'secondary', label: role }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const stats = {
    total: employees.length,
    employees: employees.filter(e => e.profile?.role === 'employee').length,
    admins: employees.filter(e => e.profile?.role === 'admin').length,
    superAdmins: employees.filter(e => e.profile?.role === 'super_admin').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-gray-500 mt-1">Manage employees and their roles</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Employee
        </Button>
      </div>

      {/* Create Employee Dialog */}
      {showCreateDialog && (
        <CreateEmployeeDialog
          onClose={() => setShowCreateDialog(false)}
          departments={departments}
          designations={designations}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Employees</p>
                <p className="text-2xl font-bold">{stats.employees}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Admins</p>
                <p className="text-2xl font-bold">{stats.admins}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Super Admins</p>
                <p className="text-2xl font-bold">{stats.superAdmins}</p>
              </div>
              <Users className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'employee', 'admin', 'super_admin'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'super_admin' ? 'Super Admin' : status}
          </Button>
        ))}
      </div>

      {/* Employees List */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={employee.profile?.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {employee.profile ? getInitials(employee.profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Employee Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {employee.profile?.full_name || 'Unknown'}
                        </h3>
                        <p className="text-sm text-gray-500">ID: {employee.employee_id}</p>
                      </div>
                      {getRoleBadge(employee.profile?.role || 'employee')}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{employee.profile?.email}</span>
                      </div>
                      {employee.profile?.phone && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Phone className="w-4 h-4" />
                          <span>{employee.profile.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {formatDate(employee.joining_date)}</span>
                      </div>
                      {employee.department && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Building2 className="w-4 h-4" />
                          <span>{employee.department.name}</span>
                        </div>
                      )}
                      {employee.designation && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Briefcase className="w-4 h-4" />
                          <span>{employee.designation.title}</span>
                        </div>
                      )}
                    </div>

                    {/* Team Assignment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Department</label>
                        <select
                          value={employee.department?.id || ''}
                          onChange={(e) => handleTeamUpdate(employee.id, 'department_id', e.target.value)}
                          disabled={loading === employee.id}
                          className="flex h-9 w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                        >
                          <option value="">No Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Designation</label>
                        <select
                          value={employee.designation?.id || ''}
                          onChange={(e) => handleTeamUpdate(employee.id, 'designation_id', e.target.value)}
                          disabled={loading === employee.id}
                          className="flex h-9 w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                        >
                          <option value="">No Designation</option>
                          {designations.map((desig) => (
                            <option key={desig.id} value={desig.id}>
                              {desig.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Role Change Buttons */}
                    <div className="flex gap-2 mt-4">
                      <span className="text-sm text-gray-500 mr-2">Change Role:</span>
                      <Button
                        size="sm"
                        variant={employee.profile?.role === 'employee' ? 'default' : 'outline'}
                        onClick={() => handleRoleChange(employee.id, 'employee')}
                        disabled={loading === employee.id || employee.id === currentUserId}
                      >
                        Employee
                      </Button>
                      <Button
                        size="sm"
                        variant={employee.profile?.role === 'admin' ? 'default' : 'outline'}
                        onClick={() => handleRoleChange(employee.id, 'admin')}
                        disabled={loading === employee.id || employee.id === currentUserId}
                      >
                        Admin
                      </Button>
                      <Button
                        size="sm"
                        variant={employee.profile?.role === 'super_admin' ? 'destructive' : 'outline'}
                        onClick={() => handleRoleChange(employee.id, 'super_admin')}
                        disabled={loading === employee.id || employee.id === currentUserId}
                      >
                        Super Admin
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
