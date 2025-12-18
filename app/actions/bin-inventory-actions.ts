'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type BinInventoryItem = {
    id: string
    general_inventory_id: string
    item_name: string
    category: string
    serial_number?: string | null
    quantity: number
    unit_price?: number | null
    total_value?: number | null
    reason: string
    disposal_date: string
    created_by?: string | null
    created_at: string
    notes?: string | null
}

/**
 * Get all bin inventory items
 */
export async function getBinInventory() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bin_inventory')
        .select(`
            *,
            general_inventory:general_inventory_id (
                id,
                item_name,
                category,
                description,
                location
            ),
            creator:created_by (
                id,
                full_name,
                email
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching bin inventory:', error)
        throw new Error(`Failed to fetch bin inventory: ${error.message}`)
    }

    return data
}

/**
 * Move items from general inventory to bin (permanent disposal)
 */
export async function moveToBin(params: {
    generalInventoryId: string
    quantity: number
    reason: string
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
        throw new Error('Only super admins can move items to bin inventory')
    }

    // Get the general inventory item
    const { data: inventoryItem, error: fetchError } = await supabase
        .from('general_inventory')
        .select('*')
        .eq('id', params.generalInventoryId)
        .single()

    if (fetchError || !inventoryItem) {
        throw new Error('Inventory item not found')
    }

    // Validate quantity
    if (params.quantity <= 0) {
        throw new Error('Quantity must be greater than 0')
    }

    if (params.quantity > inventoryItem.quantity) {
        throw new Error(`Insufficient quantity. Available: ${inventoryItem.quantity}, Requested: ${params.quantity}`)
    }

    // Calculate new quantity
    const newQuantity = inventoryItem.quantity - params.quantity

    // Start transaction: Update general inventory and insert into bin inventory
    // Update general inventory quantity
    const { error: updateError } = await supabase
        .from('general_inventory')
        .update({
            quantity: newQuantity,
            last_updated_by: user.id
        })
        .eq('id', params.generalInventoryId)

    if (updateError) {
        console.error('Error updating general inventory:', updateError)
        throw new Error(`Failed to update inventory: ${updateError.message}`)
    }

    // Insert into bin inventory
    const { data: binItem, error: insertError } = await supabase
        .from('bin_inventory')
        .insert({
            general_inventory_id: params.generalInventoryId,
            item_name: inventoryItem.item_name,
            category: inventoryItem.category,
            serial_number: inventoryItem.serial_number,
            quantity: params.quantity,
            unit_price: inventoryItem.unit_price,
            reason: params.reason,
            notes: params.notes,
            created_by: user.id
        })
        .select()
        .single()

    if (insertError) {
        // Rollback: restore the original quantity
        await supabase
            .from('general_inventory')
            .update({ quantity: inventoryItem.quantity })
            .eq('id', params.generalInventoryId)

        console.error('Error inserting into bin inventory:', insertError)
        throw new Error(`Failed to move to bin inventory: ${insertError.message}`)
    }

    revalidatePath('/super-admin/inventory')
    revalidatePath('/super-admin/bin-inventory')

    return { success: true, data: binItem }
}

/**
 * Delete an item from bin inventory
 */
export async function deleteBinInventoryItem(id: string) {
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
        throw new Error('Only super admins can delete bin inventory items')
    }

    const { error } = await supabase
        .from('bin_inventory')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting bin inventory item:', error)
        throw new Error(`Failed to delete bin inventory item: ${error.message}`)
    }

    revalidatePath('/super-admin/bin-inventory')
    return { success: true }
}
