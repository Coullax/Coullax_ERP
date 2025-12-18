'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/app/actions/department-actions'
import { Building2, Users, Edit, Trash2, Plus, X } from 'lucide-react'
import { clouddebugger } from 'googleapis/build/src/apis/clouddebugger'

interface DepartmentsPageClientProps {
  departments: any[]
  users: any[]
}

export function DepartmentsPageClient({ departments, users }: DepartmentsPageClientProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleDelete = async (deptId: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return

    setLoading(true)
    try {
      await deleteDepartment(deptId)
      toast.success('Department deleted successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete department')
    } finally {
      setLoading(false)
    }
  }

  // Organize departments by hierarchy
  const rootDepartments = departments.filter(d => !d.parent_id)
  const getSubDepartments = (parentId: string) =>
    departments.filter(d => d.parent_id === parentId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department Management</h1>
          <p className="text-gray-500 mt-1">Manage department hierarchy and structure</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Department
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Departments</p>
                <p className="text-3xl font-bold">{departments.length}</p>
              </div>
              <Building2 className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Root Departments</p>
                <p className="text-3xl font-bold">{rootDepartments.length}</p>
              </div>
              <Building2 className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Employees</p>
                <p className="text-3xl font-bold">
                  {departments.reduce((sum, d) => sum + d.employee_count, 0)}
                </p>
              </div>
              <Users className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments List with Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle>Departments Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rootDepartments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                department={dept}
                subDepartments={getSubDepartments(dept.id)}
                onEdit={setEditingDept}
                onDelete={handleDelete}
                loading={loading}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingDept) && (
        <DepartmentDialog
          department={editingDept}
          departments={departments}
          users={users}
          onClose={() => {
            setShowCreateDialog(false)
            setEditingDept(null)
          }}
        />
      )}
    </div>
  )
}

function DepartmentCard({
  department,
  subDepartments,
  onEdit,
  onDelete,
  loading,
  level = 0,
}: any) {
  return (
    <div className={`${level > 0 ? 'ml-8 mt-2' : ''}`}>
      <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">{department.name}</h3>
                {department.parent && (
                  <Badge variant="outline">Sub-department</Badge>
                )}
              </div>
              {department.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {department.description}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{department.employee_count} employees</span>
                </div>
                {department.head && (
                  <div className="flex items-center gap-1">
                    <span>{level > 0 ? 'Team Lead' : 'Head'}:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {department.head.full_name}
                    </span>
                  </div>
                )}
                {department.parent && (
                  <div className="flex items-center gap-1">
                    <span>Parent:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {department.parent.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(department)}
              disabled={loading}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(department.id)}
              disabled={loading}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      {subDepartments.map((sub: any) => (
        <DepartmentCard
          key={sub.id}
          department={sub}
          subDepartments={[]}
          onEdit={onEdit}
          onDelete={onDelete}
          loading={loading}
          level={level + 1}
        />
      ))}
    </div>
  )
}

function DepartmentDialog({ department, departments, users, onClose }: any) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: department?.name || '',
    description: department?.description || '',
    head_id: department?.head_id || '',
    parent_id: department?.parent_id || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (department) {
        await updateDepartment(department.id, {
          ...formData,
          head_id: formData.head_id || null,
          parent_id: formData.parent_id || null,
        })
        toast.success('Department updated successfully!')
      } else {
        await createDepartment({
          ...formData,
          head_id: formData.head_id || undefined,
          parent_id: formData.parent_id || undefined,
        })
        toast.success('Department created successfully!')
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
          <CardTitle>{department ? 'Edit' : 'Create'} Department</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Department description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="head">Department Head</Label>
              <select
                id="head"
                value={formData.head_id}
                onChange={(e) => setFormData({ ...formData, head_id: e.target.value })}
                className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">No Head</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Department</Label>
              <select
                id="parent"
                value={formData.parent_id}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                className="flex h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Root Department</option>
                {departments
                  .filter((d: any) => d.id !== department?.id)
                  .map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : department ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
