'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type MaintenanceInventoryItem = {
    id: string
    general_inventory_id: string
    item_name: string
    category: string
    serial_number?: string | null
    quantity: number
    unit_price?: number | null
    total_value?: number | null
    issue_description: string
    repair_notes?: string | null
    status: 'pending' | 'in_progress' | 'completed' | 'returned'
    expected_completion_date?: string | null
    actual_completion_date?: string | null
    moved_to_maintenance_date: string
    returned_to_inventory_date?: string | null
    created_by?: string | null
    created_at: string
    updated_at: string
    last_updated_by?: string | null
}

/**
 * Get all maintenance inventory items
 */
export async function getMaintenanceInventory(includeReturned: boolean = false) {
    const supabase = await createClient()

    let query = supabase
        .from('maintenance_inventory')
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
            ),
            updater:last_updated_by (
                id,
                full_name,
                email
            )
        `)
        .order('created_at', { ascending: false })

    // Optionally filter out returned items
    if (!includeReturned) {
        query = query.neq('status', 'returned')
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching maintenance inventory:', error)
        throw new Error(`Failed to fetch maintenance inventory: ${error.message}`)
    }

    return data
}

/**
 * Move items from general inventory to maintenance
 */
export async function moveToMaintenance(params: {
    generalInventoryId: string
    quantity: number
    issueDescription: string
    expectedCompletionDate?: string
    repairNotes?: string
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
        throw new Error('Only super admins can move items to maintenance inventory')
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

    // Insert into maintenance inventory
    const { data: maintenanceItem, error: insertError } = await supabase
        .from('maintenance_inventory')
        .insert({
            general_inventory_id: params.generalInventoryId,
            item_name: inventoryItem.item_name,
            category: inventoryItem.category,
            serial_number: inventoryItem.serial_number,
            quantity: params.quantity,
            unit_price: inventoryItem.unit_price,
            issue_description: params.issueDescription,
            repair_notes: params.repairNotes,
            expected_completion_date: params.expectedCompletionDate,
            status: 'pending',
            created_by: user.id,
            last_updated_by: user.id
        })
        .select()
        .single()

    if (insertError) {
        // Rollback: restore the original quantity
        await supabase
            .from('general_inventory')
            .update({ quantity: inventoryItem.quantity })
            .eq('id', params.generalInventoryId)

        console.error('Error inserting into maintenance inventory:', insertError)
        throw new Error(`Failed to move to maintenance inventory: ${insertError.message}`)
    }

    revalidatePath('/super-admin/inventory')
    revalidatePath('/super-admin/maintenance-inventory')

    return { success: true, data: maintenanceItem }
}

/**
 * Update maintenance item status and notes
 */
export async function updateMaintenanceStatus(
    id: string,
    params: {
        status?: 'pending' | 'in_progress' | 'completed'
        repairNotes?: string
        actualCompletionDate?: string
    }
) {
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
        throw new Error('Only super admins can update maintenance inventory')
    }

    const { data, error } = await supabase
        .from('maintenance_inventory')
        .update({
            ...params,
            last_updated_by: user.id
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating maintenance inventory:', error)
        throw new Error(`Failed to update maintenance inventory: ${error.message}`)
    }

    revalidatePath('/super-admin/maintenance-inventory')
    return { success: true, data }
}

/**
 * Return items from maintenance back to general inventory
 */
export async function returnFromMaintenance(id: string) {
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
        throw new Error('Only super admins can return items from maintenance')
    }

    // Get the maintenance inventory item
    const { data: maintenanceItem, error: fetchError } = await supabase
        .from('maintenance_inventory')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !maintenanceItem) {
        throw new Error('Maintenance item not found')
    }

    // Check if already returned
    if (maintenanceItem.status === 'returned') {
        throw new Error('Item has already been returned to inventory')
    }

    // Get the general inventory item
    const { data: generalItem, error: generalFetchError } = await supabase
        .from('general_inventory')
        .select('*')
        .eq('id', maintenanceItem.general_inventory_id)
        .single()

    if (generalFetchError || !generalItem) {
        throw new Error('Original inventory item not found')
    }

    // Calculate new quantity (add back the maintenance quantity)
    const newQuantity = generalItem.quantity + maintenanceItem.quantity

    // Update general inventory quantity
    const { error: updateError } = await supabase
        .from('general_inventory')
        .update({
            quantity: newQuantity,
            last_updated_by: user.id
        })
        .eq('id', maintenanceItem.general_inventory_id)

    if (updateError) {
        console.error('Error updating general inventory:', updateError)
        throw new Error(`Failed to update inventory: ${updateError.message}`)
    }

    // Update maintenance inventory status to 'returned'
    const { data: updatedMaintenance, error: maintenanceUpdateError } = await supabase
        .from('maintenance_inventory')
        .update({
            status: 'returned',
            returned_to_inventory_date: new Date().toISOString().split('T')[0],
            last_updated_by: user.id
        })
        .eq('id', id)
        .select()
        .single()

    if (maintenanceUpdateError) {
        // Rollback: restore the original quantity
        await supabase
            .from('general_inventory')
            .update({ quantity: generalItem.quantity })
            .eq('id', maintenanceItem.general_inventory_id)

        console.error('Error updating maintenance inventory:', maintenanceUpdateError)
        throw new Error(`Failed to return item: ${maintenanceUpdateError.message}`)
    }

    revalidatePath('/super-admin/inventory')
    revalidatePath('/super-admin/maintenance-inventory')

    return { success: true, data: updatedMaintenance }
}

/**
 * Delete a maintenance inventory item (only if not returned)
 */
export async function deleteMaintenanceInventoryItem(id: string) {
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
        throw new Error('Only super admins can delete maintenance inventory items')
    }

    // Check if item has been returned
    const { data: maintenanceItem } = await supabase
        .from('maintenance_inventory')
        .select('status')
        .eq('id', id)
        .single()

    if (maintenanceItem?.status === 'returned') {
        throw new Error('Cannot delete returned items. They are kept for historical records.')
    }

    const { error } = await supabase
        .from('maintenance_inventory')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting maintenance inventory item:', error)
        throw new Error(`Failed to delete maintenance inventory item: ${error.message}`)
    }

    revalidatePath('/super-admin/maintenance-inventory')
    return { success: true }
}
