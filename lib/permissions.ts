import { UserRole } from './types'

export const PERMISSIONS = {
  // Employee permissions
  VIEW_OWN_PROFILE: 'view_own_profile',
  EDIT_OWN_PROFILE: 'edit_own_profile',
  CREATE_REQUEST: 'create_request',
  VIEW_OWN_REQUESTS: 'view_own_requests',
  VIEW_OWN_ATTENDANCE: 'view_own_attendance',

  // Admin permissions
  VIEW_ALL_EMPLOYEES: 'view_all_employees',
  CREATE_EMPLOYEE: 'create_employee',
  EDIT_EMPLOYEE: 'edit_employee',
  DELETE_EMPLOYEE: 'delete_employee',
  APPROVE_REQUESTS: 'approve_requests',
  VIEW_ALL_ATTENDANCE: 'view_all_attendance',
  MANAGE_ATTENDANCE: 'manage_attendance',
  VIEW_ANALYTICS: 'view_analytics',

  // Super Admin permissions
  CREATE_ADMIN: 'create_admin',
  MANAGE_DEPARTMENTS: 'manage_departments',
  MANAGE_ROLES: 'manage_roles',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  SYSTEM_SETTINGS: 'system_settings',
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  employee: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.CREATE_REQUEST,
    PERMISSIONS.VIEW_OWN_REQUESTS,
    PERMISSIONS.VIEW_OWN_ATTENDANCE,
  ],
  supervisor: [
    // All employee permissions
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.CREATE_REQUEST,
    PERMISSIONS.VIEW_OWN_REQUESTS,
    PERMISSIONS.VIEW_OWN_ATTENDANCE,
    // Supervisor-specific permissions
    PERMISSIONS.APPROVE_REQUESTS,
  ],
  admin: [
    // All employee permissions
    ...Object.values(PERMISSIONS).filter(p => p.startsWith('view_own_') || p.startsWith('edit_own_') || p === PERMISSIONS.CREATE_REQUEST),
    // Admin-specific permissions
    PERMISSIONS.VIEW_ALL_EMPLOYEES,
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.EDIT_EMPLOYEE,
    PERMISSIONS.DELETE_EMPLOYEE,
    PERMISSIONS.APPROVE_REQUESTS,
    PERMISSIONS.VIEW_ALL_ATTENDANCE,
    PERMISSIONS.MANAGE_ATTENDANCE,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  super_admin: Object.values(PERMISSIONS), // All permissions
}

export function hasPermission(role: UserRole | undefined, permission: string): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

export function canAccessAdminPanel(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function canAccessSuperAdminPanel(role: UserRole | undefined): boolean {
  return role === 'super_admin'
}
