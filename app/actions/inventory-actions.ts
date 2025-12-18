'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Get all inventory categories
 */
export async function getInventoryCategories() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name', { ascending: true })

    if (error) throw error
    return data
}

/**
 * Get all inventory items for an employee
 */
export async function getEmployeeInventory(employeeId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('employee_inventory')
        .select(`
      *,
      category:inventory_categories(id, name, description, icon)
    `)
        .eq('employee_id', employeeId)
        .order('assigned_date', { ascending: false })

    if (error) throw error
    return data
}

/**
 * Get inventory items by category for an employee
 */
export async function getInventoryByCategory(employeeId: string, categoryId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('employee_inventory')
        .select(`
      *,
      category:inventory_categories(id, name, description, icon)
    `)
        .eq('employee_id', employeeId)
        .eq('category_id', categoryId)
        .order('assigned_date', { ascending: false })

    if (error) throw error
    return data
}

/**
 * Add a new inventory item
 */
export async function addInventoryItem(employeeId: string, item: {
    category_id: string
    item_name: string
    item_type?: string
    serial_number?: string
    assigned_date?: string
    condition?: string
    notes?: string
}) {
    const supabase = await createClient()

    // Check if inventory is already verified
    const { data: existingItems } = await supabase
        .from('employee_inventory')
        .select('isverified')
        .eq('employee_id', employeeId)
        .eq('isverified', true)
        .limit(1)

    if (existingItems && existingItems.length > 0) {
        throw new Error('Cannot add items to verified inventory')
    }

    const { error } = await supabase
        .from('employee_inventory')
        .insert({
            employee_id: employeeId,
            ...item,
        })

    if (error) throw error

    revalidatePath('/profile')
    revalidatePath('/admin/employees')
    return { success: true }
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string) {
    const supabase = await createClient()

    // First check if the item is verified
    const { data: item } = await supabase
        .from('employee_inventory')
        .select('isverified')
        .eq('id', id)
        .single()

    if (item?.isverified) {
        throw new Error('Cannot delete verified inventory item')
    }

    const { error } = await supabase
        .from('employee_inventory')
        .delete()
        .eq('id', id)

    if (error) throw error

    revalidatePath('/profile')
    revalidatePath('/admin/employees')
    return { success: true }
}

/**
 * Verify all inventory items for an employee (Admin only)
 */
export async function verifyEmployeeInventory(employeeId: string, verifiedByAdminId: string) {
    const supabase = await createClient()

    console.log('Attempting to verify employee inventory:', { employeeId, verifiedByAdminId })

    // Verify all inventory items for this employee
    const { data, error } = await supabase
        .from('employee_inventory')
        .update({
            isverified: true,
            verified_at: new Date().toISOString(),
            verified_by: verifiedByAdminId,
        })
        .eq('employee_id', employeeId)
        .select()

    if (error) {
        console.error('Inventory verification error:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
        })
        throw new Error(`Failed to verify inventory: ${error.message}`)
    }

    console.log('Inventory verification successful:', data)

    revalidatePath('/profile')
    revalidatePath('/admin/employees')
    return { success: true }
}
