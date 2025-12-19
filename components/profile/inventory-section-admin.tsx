'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
    verifyEmployeeInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getInventoryCategories,
    uploadAssetConditionImage,
} from '@/app/actions/inventory-actions'
import { getGeneralInventory, type GeneralInventoryItem } from '@/app/actions/general-inventory-actions'
import { Package, CheckCircle, Shield, ShieldCheck, Laptop, Phone, Key, Home, Briefcase, Pencil, Plus, Edit, Trash2, Upload, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

interface InventorySectionAdminProps {
    employeeId: string
    inventory: any[]
    onVerified?: () => void
}

interface InventoryItem {
    id: string
    employee_id: string
    category_id: string
    item_name: string
    item_type?: string
    serial_number?: string
    assigned_date?: string
    return_date?: string
    condition?: string
    notes?: string
    isverified?: boolean
    verified_at?: string
    verified_by?: string
    general_inventory_id?: string
    quantity_assigned?: number
    category?: {
        id: string
        name: string
        description?: string
        icon?: string
    }
    general_item?: {
        item_name: string
        category: string
    }
}

interface Category {
    id: string
    name: string
    description?: string
    icon?: string
}

const categoryIcons: Record<string, any> = {
    laptop: Laptop,
    phone: Phone,
    key: Key,
    shield: ShieldCheck,
    armchair: Package,
    home: Home,
    pencil: Pencil,
    briefcase: Briefcase,
}

export function InventorySectionAdmin({ employeeId, inventory, onVerified }: InventorySectionAdminProps) {
    const [verifying, setVerifying] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [generalInventory, setGeneralInventory] = useState<GeneralInventoryItem[]>([])
    const [selectedGeneralItem, setSelectedGeneralItem] = useState<GeneralInventoryItem | null>(null)
    const [conditionImageFile, setConditionImageFile] = useState<File | null>(null)
    const [conditionImagePreview, setConditionImagePreview] = useState<string | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [formData, setFormData] = useState({
        category_id: '',
        item_name: '',
        item_type: '',
        serial_number: '',
        assigned_date: '',
        condition: '',
        notes: '',
        general_inventory_id: '',
        quantity_assigned: '1',
        condition_image_url: '',
    })
    const user = useAuthStore((state) => state.user)

    // Check if inventory is verified
    const isInventoryVerified = inventory.length > 0 && inventory.every(item => item.isverified === true)

    const loadCategories = useCallback(async () => {
        try {
            const cats = await getInventoryCategories()
            setCategories(cats)
        } catch (error) {
            console.error('Failed to load categories:', error)
            toast.error('Failed to load categories')
        }
    }, [])

    const loadGeneralInventory = useCallback(async () => {
        try {
            const items = await getGeneralInventory({ status: 'available' })
            // Only show items with quantity > 0
            setGeneralInventory(items.filter(item => item.quantity > 0))
        } catch (error) {
            console.error('Failed to load general inventory:', error)
            toast.error('Failed to load general inventory')
        }
    }, [])

    const handleVerify = useCallback(async () => {
        if (!user?.id) {
            toast.error('You must be logged in to verify inventory')
            return
        }

        if (inventory.length === 0) {
            toast.error('No inventory items to verify')
            return
        }

        if (!confirm('Are you sure you want to verify this employee\'s inventory? This action will lock their ability to add or delete items.')) {
            return
        }

        setVerifying(true)
        try {
            await verifyEmployeeInventory(employeeId, user.id)
            toast.success('Inventory verified successfully!')
            onVerified?.()
        } catch (error: any) {
            console.error('Verification failed:', error)
            toast.error(error.message || 'Failed to verify inventory')
        } finally {
            setVerifying(false)
        }
    }, [employeeId, user?.id, inventory.length, onVerified])

    const handleOpenDialog = async (item?: InventoryItem) => {
        await loadCategories()
        await loadGeneralInventory()
        if (item) {
            setEditingItem(item)
            setFormData({
                category_id: item.category_id,
                item_name: item.item_name,
                item_type: item.item_type || '',
                serial_number: item.serial_number || '',
                assigned_date: item.assigned_date || '',
                condition: item.condition || '',
                notes: item.notes || '',
                general_inventory_id: item.general_inventory_id || '',
                quantity_assigned: item.quantity_assigned?.toString() || '1',
                condition_image_url: '',
            })
        } else {
            setEditingItem(null)
            setSelectedGeneralItem(null)
            setConditionImageFile(null)
            setConditionImagePreview(null)
            setFormData({
                category_id: '',
                item_name: '',
                item_type: '',
                serial_number: '',
                assigned_date: '',
                condition: '',
                notes: '',
                general_inventory_id: '',
                quantity_assigned: '1',
                condition_image_url: '',
            })
        }
        setIsDialogOpen(true)
    }

    const handleCloseDialog = () => {
        setIsDialogOpen(false)
        setEditingItem(null)
    }

    const handleConditionImageUpload = async () => {
        if (!conditionImageFile) return

        setUploadingImage(true)
        try {
            const imageFormData = new FormData()
            imageFormData.append('file', conditionImageFile)
            imageFormData.append('employeeId', employeeId)

            const result = await uploadAssetConditionImage(imageFormData)
            setFormData({ ...formData, condition_image_url: result.url })
            toast.success('Image uploaded successfully!')
        } catch (error: any) {
            console.error('Image upload failed:', error)
            toast.error(error.message || 'Failed to upload image')
        } finally {
            setUploadingImage(false)
        }
    }

    const handleConditionImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size should be less than 10MB')
            return
        }

        setConditionImageFile(file)

        // Create preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setConditionImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveConditionImage = () => {
        setConditionImageFile(null)
        setConditionImagePreview(null)
        setFormData({ ...formData, condition_image_url: '' })
    }

    const handleSave = async () => {
        // Only allow assignment from general inventory
        if (!editingItem && !formData.general_inventory_id) {
            toast.error('Please select an item from general inventory')
            return
        }

        if (!editingItem && !formData.quantity_assigned) {
            toast.error('Please specify quantity to assign')
            return
        }

        // Upload condition image if selected but not yet uploaded
        if (conditionImageFile && !formData.condition_image_url) {
            toast.error('Please upload the condition image before saving')
            return
        }

        setSaving(true)
        try {
            // Clean up data - convert empty strings to undefined for UUID fields
            const dataToSave = {
                ...formData,
                general_inventory_id: formData.general_inventory_id || undefined,
                category_id: formData.category_id || undefined,
                quantity_assigned: formData.quantity_assigned ? parseInt(formData.quantity_assigned) : undefined,
                condition_image_url: formData.condition_image_url || undefined,
            }

            if (editingItem) {
                await updateInventoryItem(editingItem.id, dataToSave)
                toast.success('Item updated successfully!')
            } else {
                await addInventoryItem(employeeId, dataToSave)
                toast.success('Item assigned successfully!')
            }
            handleCloseDialog()
            onVerified?.()
        } catch (error: any) {
            console.error('Save failed:', error)
            toast.error(error.message || 'Failed to save item')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) {
            return
        }

        setDeleting(id)
        try {
            await deleteInventoryItem(id)
            toast.success('Item deleted successfully!')
            onVerified?.()
        } catch (error: any) {
            console.error('Delete failed:', error)
            toast.error(error.message || 'Failed to delete item')
        } finally {
            setDeleting(null)
        }
    }

    // Group inventory by category
    const inventoryByCategory = inventory.reduce((acc, item) => {
        const categoryName = item.category?.name || 'Uncategorized'
        if (!acc[categoryName]) {
            acc[categoryName] = []
        }
        acc[categoryName].push(item)
        return acc
    }, {} as Record<string, InventoryItem[]>)

    const getCategoryIcon = (iconName?: string) => {
        if (!iconName) return Package
        return categoryIcons[iconName] || Package
    }

    const handleGeneralItemSelect = (itemId: string) => {
        const item = generalInventory.find(i => i.id === itemId)
        if (item) {
            setSelectedGeneralItem(item)
            setFormData({
                ...formData,
                general_inventory_id: item.id,
                item_name: item.item_name,
                item_type: item.category || '',
                serial_number: item.serial_number || '',
                condition: item.condition || '',
            })
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Inventory
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleOpenDialog()}
                                size="sm"
                                variant="outline"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Item
                            </Button>
                            {!isInventoryVerified && inventory.length > 0 && (
                                <Button
                                    onClick={handleVerify}
                                    disabled={verifying}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    {verifying ? 'Verifying...' : 'Verify Inventory'}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Verification Status Badge */}
                    {isInventoryVerified && (
                        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <div>
                                    <p className="font-semibold text-green-900 dark:text-green-100">Inventory Verified</p>
                                    {inventory[0]?.verified_at && (
                                        <p className="text-sm text-green-700 dark:text-green-300">
                                            Verified on {new Date(inventory[0].verified_at).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    )}

                    {inventory.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No inventory items added yet.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(inventoryByCategory).map(([categoryName, items]) => {
                                const typedItems = items as InventoryItem[]
                                const Icon = getCategoryIcon(typedItems[0]?.category?.icon)
                                return (
                                    <div key={categoryName} className="space-y-3">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Icon className="w-5 h-5" />
                                            {categoryName}
                                            <Badge variant="secondary" className="ml-2">{typedItems.length}</Badge>
                                        </h3>
                                        <div className="space-y-2">
                                            {typedItems.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold">{item.item_name}</h4>
                                                                {item.isverified && (
                                                                    <Badge variant="default" className="bg-green-600">
                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                        Verified
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {item.item_type && (
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.item_type}</p>
                                                            )}
                                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                {item.quantity_assigned && (
                                                                    <Badge variant="default" className="bg-blue-600">
                                                                        Qty: {item.quantity_assigned}
                                                                    </Badge>
                                                                )}
                                                                {item.serial_number && (
                                                                    <Badge variant="outline">SN: {item.serial_number}</Badge>
                                                                )}
                                                                {item.assigned_date && (
                                                                    <Badge variant="secondary">
                                                                        Assigned: {new Date(item.assigned_date).toLocaleDateString()}
                                                                    </Badge>
                                                                )}
                                                                {item.condition && (
                                                                    <Badge variant="outline">{item.condition}</Badge>
                                                                )}
                                                            </div>
                                                            {item.notes && (
                                                                <p className="text-sm text-gray-500 mt-2">{item.notes}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2 ml-4">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleOpenDialog(item)}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleDelete(item.id)}
                                                                disabled={deleting === item.id}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit' : 'Add'} Inventory Item</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Update' : 'Add'} inventory item details for this employee.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* General Inventory Selection - Required */}
                        {!editingItem && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="general_item">Select Item from General Inventory *</Label>
                                    <Select
                                        value={formData.general_inventory_id}
                                        onValueChange={handleGeneralItemSelect}
                                        required
                                    >
                                        <SelectTrigger id="general_item">
                                            <SelectValue placeholder="Select an item from inventory" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {generalInventory.length === 0 ? (
                                                <SelectItem value="no-items" disabled>
                                                    No items available in general inventory
                                                </SelectItem>
                                            ) : (
                                                generalInventory.map((item) => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.item_name} - {item.category} (Available: {item.quantity})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {selectedGeneralItem && (
                                        <div className="text-sm space-y-1">
                                            <p className="text-muted-foreground">
                                                Available quantity: <span className="font-semibold text-foreground">{selectedGeneralItem.quantity}</span>
                                            </p>
                                            <p className="text-muted-foreground">
                                                Category: <span className="font-semibold text-foreground">{selectedGeneralItem.category}</span>
                                            </p>
                                            {selectedGeneralItem.serial_number && (
                                                <p className="text-muted-foreground">
                                                    Serial: <span className="font-semibold text-foreground">{selectedGeneralItem.serial_number}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Quantity Assignment */}
                                {formData.general_inventory_id && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="quantity_assigned">Quantity to Assign *</Label>
                                        <Input
                                            id="quantity_assigned"
                                            type="number"
                                            min="1"
                                            max={selectedGeneralItem?.quantity || 999}
                                            value={formData.quantity_assigned}
                                            onChange={(e) => setFormData({ ...formData, quantity_assigned: e.target.value })}
                                            required
                                        />
                                        {selectedGeneralItem && (
                                            <p className="text-xs text-muted-foreground">
                                                Max: {selectedGeneralItem.quantity}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Show item details for editing */}
                        {editingItem && (
                            <div className="bg-muted p-3 rounded-lg space-y-1">
                                <p className="text-sm font-medium">{formData.item_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formData.item_type && `${formData.item_type} • `}
                                    {formData.serial_number && `SN: ${formData.serial_number} • `}
                                    Quantity: {formData.quantity_assigned}
                                </p>
                            </div>
                        )}

                        {/* Assigned Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="assigned_date">Assigned Date</Label>
                            <Input
                                id="assigned_date"
                                type="date"
                                value={formData.assigned_date}
                                onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                            />
                        </div>

                        {/* Asset Condition Image */}
                        {!editingItem && (
                            <div className="grid gap-2">
                                <Label htmlFor="condition_image">Asset Condition Image</Label>
                                <div className="space-y-2">
                                    <Input
                                        id="condition_image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleConditionImageSelect}
                                        disabled={uploadingImage}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Upload a photo showing the current condition of the asset (Optional, Max 10MB)
                                    </p>

                                    {conditionImagePreview && (
                                        <div className="relative w-full max-w-md rounded-lg border-2 border-gray-200 overflow-hidden">
                                            <img
                                                src={conditionImagePreview}
                                                alt="Asset condition preview"
                                                className="w-full h-48 object-cover"
                                            />
                                            <div className="absolute top-2 right-2 flex gap-2">
                                                {!formData.condition_image_url && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleConditionImageUpload}
                                                        disabled={uploadingImage}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        <Upload className="w-4 h-4 mr-1" />
                                                        {uploadingImage ? 'Uploading...' : 'Upload'}
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={handleRemoveConditionImage}
                                                    disabled={uploadingImage}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            {formData.condition_image_url && (
                                                <div className="absolute bottom-2 left-2">
                                                    <Badge className="bg-green-600">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Uploaded
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional notes about this assignment..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
