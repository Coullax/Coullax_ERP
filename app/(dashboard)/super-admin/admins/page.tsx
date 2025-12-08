'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Shield,
  UserPlus,
  Search,
  Edit,
  Trash2,
  Loader2,
  ShieldCheck,
  Users,
  Crown,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Admin {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'super_admin'
  avatar_url: string | null
  created_at: string
  employee?: {
    employee_id: string
    joining_date: string
  }
}

interface Employee {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  employee?: {
    employee_id: string
  }
}

const getRoleBadge = (role: string) => {
  if (role === 'super_admin') {
    return (
      <Badge className="bg-purple-600 text-white">
        <Crown className="w-3 h-3 mr-1" />
        Super Admin
      </Badge>
    )
  }
  return (
    <Badge className="bg-blue-600 text-white">
      <Shield className="w-3 h-3 mr-1" />
      Admin
    </Badge>
  )
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'admin' | 'super_admin'>('admin')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/super-admin/admins')
      if (!response.ok) throw new Error('Failed to fetch admins')

      const data = await response.json()
      setAdmins(data.admins || [])
    } catch (error) {
      toast.error('Failed to load admins')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/super-admin/employees')
      if (!response.ok) throw new Error('Failed to fetch employees')

      const data = await response.json()
      setEmployees(data.employees || [])
    } catch (error) {
      console.error('Failed to load employees:', error)
    }
  }

  const handlePromoteClick = () => {
    fetchEmployees()
    setPromoteDialogOpen(true)
  }

  const handlePromote = async () => {
    if (!selectedEmployee || !selectedRole) {
      toast.error('Please select an employee and role')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedEmployee,
          role: selectedRole
        })
      })

      if (!response.ok) throw new Error('Failed to promote user')

      toast.success('User promoted successfully')
      setPromoteDialogOpen(false)
      setSelectedEmployee('')
      setSelectedRole('admin')
      fetchAdmins()
    } catch (error) {
      toast.error('Failed to promote user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditRole = (admin: Admin) => {
    setSelectedAdmin(admin)
    setSelectedRole(admin.role)
    setEditDialogOpen(true)
  }

  const handleUpdateRole = async () => {
    if (!selectedAdmin) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/super-admin/admins/${selectedAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update role')
      }

      toast.success('Role updated successfully')
      setEditDialogOpen(false)
      setSelectedAdmin(null)
      fetchAdmins()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDemote = async (admin: Admin) => {
    if (!confirm(`Are you sure you want to demote ${admin.full_name} to employee?`)) return

    try {
      const response = await fetch(`/api/super-admin/admins/${admin.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to demote admin')
      }

      toast.success('Admin demoted to employee')
      fetchAdmins()
    } catch (error: any) {
      toast.error(error.message || 'Failed to demote admin')
    }
  }

  const filteredAdmins = admins.filter(admin =>
    admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (admin.employee?.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: admins.length,
    superAdmins: admins.filter(a => a.role === 'super_admin').length,
    admins: admins.filter(a => a.role === 'admin').length
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8" />
            Admin Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage administrator roles and permissions
          </p>
        </div>
        <Button onClick={handlePromoteClick}>
          <UserPlus className="w-4 h-4 mr-2" />
          Promote to Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Admins</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Crown className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.superAdmins}</p>
              <p className="text-sm text-gray-500">Super Admins</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by name, email, or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Admins List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredAdmins.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">No admins found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery ? 'Try a different search query' : 'Promote employees to admin role'}
          </p>
          {!searchQuery && (
            <Button onClick={handlePromoteClick}>
              <UserPlus className="w-4 h-4 mr-2" />
              Promote to Admin
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdmins.map(admin => (
            <Card key={admin.id} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={admin.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(admin.full_name)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold truncate">{admin.full_name}</h3>
                      <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    {getRoleBadge(admin.role)}
                  </div>

                  {admin.employee && (
                    <p className="text-xs text-gray-500 mb-3">
                      ID: {admin.employee.employee_id}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mb-3">
                    Added {formatDistanceToNow(new Date(admin.created_at), { addSuffix: true })}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRole(admin)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Role
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDemote(admin)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Promote Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Employee to Admin</DialogTitle>
            <DialogDescription>
              Select an employee to grant administrator privileges
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee?.employee_id || emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Admin Role</Label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {selectedRole === 'super_admin'
                  ? 'Super Admins have full system access including user management'
                  : 'Admins can manage employees and approve requests'}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setPromoteDialogOpen(false)}
                className="flex-1"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePromote}
                className="flex-1"
                disabled={actionLoading || !selectedEmployee}
              >
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Promote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin Role</DialogTitle>
            <DialogDescription>
              Change the administrative role for {selectedAdmin?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Be careful when changing roles</p>
                <p>Role changes take effect immediately and affect user permissions.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Admin Role</Label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee (Demote)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="flex-1"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                className="flex-1"
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
