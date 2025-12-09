'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/permissions'

// Map permission constants to resource categories
const PERMISSION_RESOURCES: Record<string, { resource: string; action: string; description: string }> = {
  // Employee permissions
  [PERMISSIONS.VIEW_OWN_PROFILE]: { resource: 'profile', action: 'view_own', description: 'View own profile' },
  [PERMISSIONS.EDIT_OWN_PROFILE]: { resource: 'profile', action: 'edit_own', description: 'Edit own profile' },
  [PERMISSIONS.CREATE_REQUEST]: { resource: 'requests', action: 'create', description: 'Create requests' },
  [PERMISSIONS.VIEW_OWN_REQUESTS]: { resource: 'requests', action: 'view_own', description: 'View own requests' },
  [PERMISSIONS.VIEW_OWN_ATTENDANCE]: { resource: 'attendance', action: 'view_own', description: 'View own attendance' },
  
  // Admin permissions
  [PERMISSIONS.VIEW_ALL_EMPLOYEES]: { resource: 'employees', action: 'view_all', description: 'View all employees' },
  [PERMISSIONS.CREATE_EMPLOYEE]: { resource: 'employees', action: 'create', description: 'Create employees' },
  [PERMISSIONS.EDIT_EMPLOYEE]: { resource: 'employees', action: 'edit', description: 'Edit employees' },
  [PERMISSIONS.DELETE_EMPLOYEE]: { resource: 'employees', action: 'delete', description: 'Delete employees' },
  [PERMISSIONS.APPROVE_REQUESTS]: { resource: 'requests', action: 'approve', description: 'Approve/reject requests' },
  [PERMISSIONS.VIEW_ALL_ATTENDANCE]: { resource: 'attendance', action: 'view_all', description: 'View all attendance records' },
  [PERMISSIONS.MANAGE_ATTENDANCE]: { resource: 'attendance', action: 'manage', description: 'Manage attendance' },
  [PERMISSIONS.VIEW_ANALYTICS]: { resource: 'analytics', action: 'view', description: 'View analytics dashboard' },
  
  // Super Admin permissions
  [PERMISSIONS.CREATE_ADMIN]: { resource: 'admins', action: 'create', description: 'Create admin users' },
  [PERMISSIONS.MANAGE_DEPARTMENTS]: { resource: 'departments', action: 'manage', description: 'Manage departments' },
  [PERMISSIONS.MANAGE_ROLES]: { resource: 'roles', action: 'manage', description: 'Manage roles and permissions' },
  [PERMISSIONS.VIEW_AUDIT_LOGS]: { resource: 'audit', action: 'view', description: 'View audit logs' },
  [PERMISSIONS.SYSTEM_SETTINGS]: { resource: 'settings', action: 'manage', description: 'Manage system settings' },
}

export async function getPermissions() {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  const { data: permissions, error } = await supabase
    .from('permissions')
    .select('*')
    .order('resource')
    .order('action')

  if (error) throw new Error(error.message)

  // Group permissions by resource
  const grouped = permissions.reduce((acc: any, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {})

  return { permissions, grouped }
}

export async function seedPermissions() {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  // Check if permissions already exist
  const { count } = await supabase
    .from('permissions')
    .select('*', { count: 'exact', head: true })

  // If permissions exist, skip seeding
  if (count && count > 0) {
    return { message: 'Permissions already seeded', count }
  }

  // Seed permissions from PERMISSION_RESOURCES
  const permissionsToInsert = Object.entries(PERMISSION_RESOURCES).map(
    ([name, config]) => ({
      name,
      description: config.description,
      resource: config.resource,
      action: config.action,
    })
  )

  const { error } = await supabase.from('permissions').insert(permissionsToInsert)

  if (error) throw new Error(error.message)

  return { message: 'Permissions seeded successfully', count: permissionsToInsert.length }
}

export async function createPermission(data: {
  name: string
  description?: string
  resource: string
  action: string
}) {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  // Check if permission already exists
  const { data: existing } = await supabase
    .from('permissions')
    .select('id')
    .eq('name', data.name)
    .single()

  if (existing) {
    throw new Error('A permission with this name already exists')
  }

  const { data: permission, error } = await supabase
    .from('permissions')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return permission
}
