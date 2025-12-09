'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  PaginationEllipsis
} from '@/components/ui/pagination'
import { toast } from 'sonner'
import { updateEmployeeRole, updateEmployeeTeam } from '@/app/actions/employee-actions'
import { Users, Mail, Phone, Calendar, Building2, Briefcase, Plus, Edit, MoreHorizontal, Eye } from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { CreateEmployeeDialog } from '@/components/admin/create-employee-dialog'
import { EditEmployeeDialog } from '@/components/admin/edit-employee-dialog'
import { EmployeeDetailsDialog } from '@/components/admin/employee-details-dialog'

interface EmployeesPageClientProps {
  employees: any[]
  departments: any[]
  designations: any[]
  policies: any[]
  currentUserId: string
}

export function EmployeesPageClient({
  employees,
  departments,
  designations,
  policies,
  currentUserId,
}: EmployeesPageClientProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 10

  const filteredEmployees = filter === 'all'
    ? employees
    : employees.filter(emp => emp.profile?.role === filter)

  // Pagination calculations
  const paginatedEmployees = filteredEmployees.slice(offset, offset + limit)
  const totalPages = Math.ceil(filteredEmployees.length / limit)
  const currentPage = Math.floor(offset / limit) + 1

  // Reset to page 1 when filter changes
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    setOffset(0)
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
          policies={policies}
        />
      )}

      {/* Edit Employee Dialog */}
      {editingEmployee && (
        <EditEmployeeDialog
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          departments={departments}
          designations={designations}
          policies={policies}
        />
      )}

      {/* View Employee Details Dialog */}
      {viewingEmployee && (
        <EmployeeDetailsDialog
          employee={viewingEmployee}
          onClose={() => setViewingEmployee(null)}
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
            onClick={() => handleFilterChange(status)}
            className="capitalize"
          >
            {status === 'super_admin' ? 'Super Admin' : status}
          </Button>
        ))}
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Employees</span>
            <span className="text-sm font-normal text-gray-500">
              Showing {Math.min(offset + limit, filteredEmployees.length)} of {filteredEmployees.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No employees found</p>
              {filter !== 'all' && (
                <p className="text-sm mt-2">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        {/* Employee Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={employee.profile?.avatar_url} />
                              <AvatarFallback>
                                {employee.profile ? getInitials(employee.profile.full_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {employee.profile?.full_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {employee.profile?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          {getRoleBadge(employee.profile?.role || 'employee')}
                        </TableCell>

                        {/* Department */}
                        <TableCell>
                          {employee.department ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              {employee.department.name}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>

                        {/* Designation */}
                        <TableCell>
                          {employee.designation ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Briefcase className="w-4 h-4 text-gray-400" />
                              {employee.designation.title}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(employee.joining_date)}
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
                              <DropdownMenuItem onClick={() => setViewingEmployee(employee)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingEmployee(employee)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
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
                          className={offset + limit >= filteredEmployees.length ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
    </div>
  )
}

