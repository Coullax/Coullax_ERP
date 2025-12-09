'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getRoles() {
  // Use admin client to bypass RLS policies and see all roles
  const supabase = createAdminClient()

  const { data: roles, error } = await supabase
    .from('roles')
    .select(`
      *,
      role_permissions (
        permission:permissions (*)
      )
    `)
    .order('is_system_role', { ascending: false })
    .order('name')

  if (error) throw new Error(error.message)

  // Transform the data to include permission count
  const rolesWithCounts = await Promise.all(
    roles.map(async (role) => {
      // Get user count for this role
      const { count: userCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)

      return {
        ...role,
        permission_count: role.role_permissions?.length || 0,
        user_count: userCount || 0,
        permissions: role.role_permissions?.map((rp: any) => rp.permission) || [],
      }
    })
  )

  return rolesWithCounts
}

export async function getRoleById(roleId: string) {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  const { data: role, error } = await supabase
    .from('roles')
    .select(`
      *,
      role_permissions (
        permission:permissions (*)
      )
    `)
    .eq('id', roleId)
    .single()

  if (error) throw new Error(error.message)

  // Get users with this role
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select(`
      user:profiles (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('role_id', roleId)

  return {
    ...role,
    permissions: role.role_permissions?.map((rp: any) => rp.permission) || [],
    users: userRoles?.map((ur: any) => ur.user) || [],
  }
}

export async function createRole(data: { name: string; description?: string }) {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  // Check if role name already exists
  const { data: existing } = await supabase
    .from('roles')
    .select('id')
    .eq('name', data.name)
    .single()

  if (existing) {
    throw new Error('A role with this name already exists')
  }

  const { data: role, error } = await supabase
    .from('roles')
    .insert({
      name: data.name,
      description: data.description,
      is_system_role: false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/super-admin/roles')
  return role
}

export async function updateRole(
  roleId: string,
  data: { name?: string; description?: string }
) {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  // Check if role name already exists (for other roles)
  if (data.name) {
    const { data: existing } = await supabase
      .from('roles')
      .select('id')
      .eq('name', data.name)
      .neq('id', roleId)
      .single()

    if (existing) {
      throw new Error('A role with this name already exists')
    }
  }

  const { data: role, error } = await supabase
    .from('roles')
    .update({
      name: data.name,
      description: data.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roleId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/super-admin/roles')
  return role
}

export async function deleteRole(roleId: string) {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  // Check if it's a system role
  const { data: role } = await supabase
    .from('roles')
    .select('is_system_role, name')
    .eq('id', roleId)
    .single()

  if (role?.is_system_role) {
    throw new Error('Cannot delete system roles')
  }

  // Check if any users have this role
  const { count } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId)

  if (count && count > 0) {
    throw new Error(`Cannot delete role "${role?.name}". It is assigned to ${count} user(s).`)
  }

  const { error } = await supabase.from('roles').delete().eq('id', roleId)

  if (error) throw new Error(error.message)

  revalidatePath('/super-admin/roles')
}

export async function assignPermissionsToRole(
  roleId: string,
  permissionIds: string[]
) {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  // First, remove all existing permissions for this role
  await supabase.from('role_permissions').delete().eq('role_id', roleId)

  // Then add the new permissions
  if (permissionIds.length > 0) {
    const rolePermissions = permissionIds.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId,
    }))

    const { error } = await supabase
      .from('role_permissions')
      .insert(rolePermissions)

    if (error) throw new Error(error.message)
  }

  revalidatePath('/super-admin/roles')
}

export async function getUsersByRole(roleId: string) {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  const { data: userRoles, error } = await supabase
    .from('user_roles')
    .select(`
      id,
      user_id,
      expires_at,
      created_at
    `)
    .eq('role_id', roleId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user roles:', error)
    throw new Error(error.message)
  }

  if (!userRoles || userRoles.length === 0) {
    return []
  }

  // Fetch user details separately to avoid join issues
  const userIds = userRoles.map(ur => ur.user_id)
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role')
    .in('id', userIds)

  if (usersError) {
    console.error('Error fetching users:', usersError)
    throw new Error(usersError.message)
  }

  // Combine the data
  const result = userRoles.map(ur => ({
    id: ur.id,
    user: users?.find(u => u.id === ur.user_id) || null,
    expires_at: ur.expires_at,
    created_at: ur.created_at,
  }))

  return result
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
  expiresAt?: string
) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // Get current user ID for granted_by
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check if user already has this role
  const { data: existing } = await adminSupabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .single()

  if (existing) {
    throw new Error('User already has this role')
  }

  const { error } = await adminSupabase.from('user_roles').insert({
    user_id: userId,
    role_id: roleId,
    granted_by: user.id,
    expires_at: expiresAt || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/super-admin/roles')
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  // Use admin client to bypass RLS policies
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)

  if (error) throw new Error(error.message)

  revalidatePath('/super-admin/roles')
}
