'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type GeneralInventoryItem = {
    id: string
    item_name: string
    category: 'furniture' | 'equipment' | 'supplies' | 'electronics' | 'appliances' | 'tools' | 'vehicles' | 'other'
    description?: string | null
    serial_number?: string | null
    quantity: number
    unit_price?: number | null
    total_value?: number | null
    location?: string | null
    condition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged' | null
    status: 'available' | 'in-use' | 'maintenance' | 'retired' | 'disposed'
    purchase_date?: string | null
    warranty_expiry?: string | null
    supplier?: string | null
    notes?: string | null
    created_at: string
    updated_at: string
    created_by?: string | null
    last_updated_by?: string | null
}

export type InventoryFilters = {
    category?: string
    status?: string
    condition?: string
    location?: string
    searchQuery?: string
}

/**
 * Get all general inventory items with optional filtering
 */
export async function getGeneralInventory(filters?: InventoryFilters) {
    const supabase = await createClient()

    let query = supabase
        .from('general_inventory')
        .select('*')
        .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.category) {
        query = query.eq('category', filters.category)
    }
    if (filters?.status) {
        query = query.eq('status', filters.status)
    }
    if (filters?.condition) {
        query = query.eq('condition', filters.condition)
    }
    if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`)
    }
    if (filters?.searchQuery) {
        query = query.or(`item_name.ilike.%${filters.searchQuery}%,serial_number.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching general inventory:', error)
        throw new Error(`Failed to fetch inventory: ${error.message}`)
    }

    return data as GeneralInventoryItem[]
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('general_inventory')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching inventory item:', error)
        throw new Error(`Failed to fetch inventory item: ${error.message}`)
    }

    return data as GeneralInventoryItem
}

/**
 * Get inventory statistics
 */
export async function getInventoryStats() {
    const supabase = await createClient()

    // Get all inventory items
    const { data: allItems, error } = await supabase
        .from('general_inventory')
        .select('*')

    if (error) {
        console.error('Error fetching inventory stats:', error)
        throw new Error(`Failed to fetch inventory statistics: ${error.message}`)
    }

    // Calculate statistics
    const totalItems = allItems?.length || 0
    const totalValue = allItems?.reduce((sum, item) => sum + (item.total_value || 0), 0) || 0

    // Count by category
    const byCategory = allItems?.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
    }, {} as Record<string, number>) || {}

    // Count by status
    const byStatus = allItems?.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
    }, {} as Record<string, number>) || {}

    // Count by condition
    const byCondition = allItems?.reduce((acc, item) => {
        if (item.condition) {
            acc[item.condition] = (acc[item.condition] || 0) + 1
        }
        return acc
    }, {} as Record<string, number>) || {}

    // Get items with expiring warranties (within next 30 days)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringWarranties = allItems?.filter(item => {
        if (!item.warranty_expiry) return false
        const warrantyDate = new Date(item.warranty_expiry)
        return warrantyDate >= today && warrantyDate <= thirtyDaysFromNow
    }) || []

    return {
        totalItems,
        totalValue,
        byCategory,
        byStatus,
        byCondition,
        expiringWarranties: expiringWarranties.length,
        expiringWarrantiesList: expiringWarranties
    }
}

/**
 * Add a new general inventory item
 */
export async function addGeneralInventoryItem(item: {
    item_name: string
    category: string
    description?: string
    serial_number?: string
    quantity: number
    unit_price?: number
    location?: string
    condition?: string
    status?: string
    purchase_date?: string
    warranty_expiry?: string
    supplier?: string
    notes?: string
}) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('User not authenticated')
    }

    // Check if user is super admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin') {
        throw new Error('Only super admins can add inventory items')
    }

    const { data, error } = await supabase
        .from('general_inventory')
        .insert({
            ...item,
            created_by: user.id,
            last_updated_by: user.id
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding inventory item:', error)
        throw new Error(`Failed to add inventory item: ${error.message}`)
    }

    revalidatePath('/super-admin/inventory')
    return { success: true, data }
}

/**
 * Update an existing inventory item
 */
export async function updateGeneralInventoryItem(id: string, item: {
    item_name?: string
    category?: string
    description?: string
    serial_number?: string
    quantity?: number
    unit_price?: number
    location?: string
    condition?: string
    status?: string
    purchase_date?: string
    warranty_expiry?: string
    supplier?: string
    notes?: string
}) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('User not authenticated')
    }

    // Check if user is super admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin') {
        throw new Error('Only super admins can update inventory items')
    }

    const { data, error } = await supabase
        .from('general_inventory')
        .update({
            ...item,
            last_updated_by: user.id
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating inventory item:', error)
        throw new Error(`Failed to update inventory item: ${error.message}`)
    }

    revalidatePath('/super-admin/inventory')
    return { success: true, data }
}

/**
 * Delete an inventory item
 */
export async function deleteGeneralInventoryItem(id: string) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('User not authenticated')
    }

    // Check if user is super admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin') {
        throw new Error('Only super admins can delete inventory items')
    }

    const { error } = await supabase
        .from('general_inventory')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting inventory item:', error)
        throw new Error(`Failed to delete inventory item: ${error.message}`)
    }

    revalidatePath('/super-admin/inventory')
    return { success: true }
}

/**
 * Search inventory items
 */
export async function searchInventory(query: string) {
    if (!query || query.trim() === '') {
        return []
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('general_inventory')
        .select('*')
        .or(`item_name.ilike.%${query}%,serial_number.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error searching inventory:', error)
        throw new Error(`Failed to search inventory: ${error.message}`)
    }

    return data as GeneralInventoryItem[]
}
