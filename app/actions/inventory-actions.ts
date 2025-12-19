'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadToB2 } from './upload-actions'

/**
 * Upload Asset Condition Image
 */
export async function uploadAssetConditionImage(formData: FormData) {
    const file = formData.get('file') as File
    const employeeId = formData.get('employeeId') as string

    if (!file) throw new Error('No file provided')

    // Validate file type
    if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file')
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        throw new Error('Image size should be less than 10MB')
    }

    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `asset-conditions/${employeeId}/${Date.now()}.${fileExt}`

        // Add filename to formData for uploadToB2
        formData.append('filename', fileName)

        const result = await uploadToB2(formData)

        if (!result.success || !result.publicUrl) {
            throw new Error(result.error || 'Upload failed')
        }

        return {
            url: result.publicUrl,
            name: file.name,
            type: file.type,
            size: file.size
        }
    } catch (error: any) {
        console.error('Asset condition image upload failed:', error)
        throw error
    }
}

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
      category:inventory_categories(id, name, description, icon),
      general_item:general_inventory(id, item_name, category, image_url)
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
 * Helper: Get available quantity for a general inventory item
 */
export async function getAvailableInventoryQuantity(generalInventoryId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('general_inventory')
        .select('quantity')
        .eq('id', generalInventoryId)
        .single()

    if (error) throw error
    return data?.quantity || 0
}

/**
 * Helper: Decrease general inventory quantity
 */
export async function decreaseGeneralInventoryQuantity(generalInventoryId: string, quantity: number) {
    const supabase = await createClient()

    // Get current quantity
    const current = await getAvailableInventoryQuantity(generalInventoryId)

    if (current < quantity) {
        throw new Error(`Insufficient inventory. Available: ${current}, Requested: ${quantity}`)
    }

    const { error } = await supabase
        .from('general_inventory')
        .update({ quantity: current - quantity })
        .eq('id', generalInventoryId)

    if (error) throw error
}

/**
 * Helper: Increase general inventory quantity
 */
export async function increaseGeneralInventoryQuantity(generalInventoryId: string, quantity: number) {
    const supabase = await createClient()

    const current = await getAvailableInventoryQuantity(generalInventoryId)

    const { error } = await supabase
        .from('general_inventory')
        .update({ quantity: current + quantity })
        .eq('id', generalInventoryId)

    if (error) throw error
}

/**
 * Add a new inventory item
 */
export async function addInventoryItem(employeeId: string, item: {
    category_id?: string
    item_name: string
    item_type?: string
    serial_number?: string
    assigned_date?: string
    condition?: string
    notes?: string
    general_inventory_id?: string
    quantity_assigned?: number
    condition_image_url?: string
}) {
    const supabase = await createClient()

    // If assigning from general inventory, validate and decrease quantity
    if (item.general_inventory_id) {
        const quantity = item.quantity_assigned || 1
        await decreaseGeneralInventoryQuantity(item.general_inventory_id, quantity)
    }

    const { error } = await supabase
        .from('employee_inventory')
        .insert({
            employee_id: employeeId,
            ...item,
        })

    if (error) {
        // If insert fails and we decreased quantity, we should rollback
        // Note: In production, use database transactions
        if (item.general_inventory_id && item.quantity_assigned) {
            try {
                await increaseGeneralInventoryQuantity(item.general_inventory_id, item.quantity_assigned)
            } catch (rollbackError) {
                console.error('Failed to rollback quantity:', rollbackError)
            }
        }
        throw error
    }

    revalidatePath('/profile')
    revalidatePath('/admin/employees')
    return { success: true }
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string) {
    const supabase = await createClient()

    // First get the item details including general_inventory_id
    const { data: item } = await supabase
        .from('employee_inventory')
        .select('isverified, general_inventory_id, quantity_assigned')
        .eq('id', id)
        .single()

    if (item?.isverified) {
        throw new Error('Cannot delete verified inventory item')
    }

    // Delete the item
    const { error } = await supabase
        .from('employee_inventory')
        .delete()
        .eq('id', id)

    if (error) throw error

    // If item was from general inventory, return the quantity
    if (item?.general_inventory_id && item?.quantity_assigned) {
        try {
            await increaseGeneralInventoryQuantity(item.general_inventory_id, item.quantity_assigned)
        } catch (returnError) {
            console.error('Failed to return quantity to general inventory:', returnError)
            // Don't throw here as the item is already deleted
        }
    }

    revalidatePath('/profile')
    revalidatePath('/admin/employees')
    return { success: true }
}

/**
 * Update an inventory item
 */
export async function updateInventoryItem(id: string, item: {
    category_id?: string
    item_name?: string
    item_type?: string
    serial_number?: string
    assigned_date?: string
    condition?: string
    notes?: string
    quantity_assigned?: number
}) {
    const supabase = await createClient()

    // If updating quantity, handle the difference in general inventory
    if (item.quantity_assigned !== undefined) {
        const { data: currentItem } = await supabase
            .from('employee_inventory')
            .select('general_inventory_id, quantity_assigned')
            .eq('id', id)
            .single()

        if (currentItem?.general_inventory_id) {
            const oldQuantity = currentItem.quantity_assigned || 0
            const newQuantity = item.quantity_assigned
            const difference = newQuantity - oldQuantity

            if (difference > 0) {
                // Assigning more - decrease general inventory
                await decreaseGeneralInventoryQuantity(currentItem.general_inventory_id, difference)
            } else if (difference < 0) {
                // Returning some - increase general inventory
                await increaseGeneralInventoryQuantity(currentItem.general_inventory_id, Math.abs(difference))
            }
        }
    }

    const { error } = await supabase
        .from('employee_inventory')
        .update(item)
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
