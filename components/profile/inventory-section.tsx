'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
    getEmployeeInventory,
    getInventoryCategories,
    addInventoryItem,
    deleteInventoryItem
} from '@/app/actions/inventory-actions'
import { Plus, Trash2, Package, CheckCircle, Shield, Laptop, Phone, Key, ShieldCheck, Home, Briefcase, Pencil } from 'lucide-react'

interface InventorySectionProps {
    employeeId: string
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
    quantity_assigned?: number
    category?: {
        id: string
        name: string
        description?: string
        icon?: string
    }
    general_item?: {
        id: string
        item_name: string
        category: string
        image_url?: string | null
    }
}

interface InventoryCategory {
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

export function InventorySection({ employeeId }: InventorySectionProps) {
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [categories, setCategories] = useState<InventoryCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)

    // Check if inventory is verified
    const isInventoryVerified = inventory.length > 0 && inventory.every(item => item.isverified === true)

    const [formData, setFormData] = useState({
        category_id: '',
        item_name: '',
        item_type: '',
        serial_number: '',
        assigned_date: new Date().toISOString().split('T')[0],
        condition: 'Good',
        notes: '',
    })

    const loadInventory = useCallback(async () => {
        try {
            const data = await getEmployeeInventory(employeeId)
            setInventory(data)
        } catch (error) {
            toast.error('Failed to load inventory')
        } finally {
            setLoading(false)
        }
    }, [employeeId])

    const loadCategories = useCallback(async () => {
        try {
            const data = await getInventoryCategories()
            setCategories(data)
        } catch (error) {
            toast.error('Failed to load categories')
        }
    }, [])

    useEffect(() => {
        loadInventory()
        loadCategories()
    }, [loadInventory, loadCategories])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.category_id || !formData.item_name) {
            toast.error('Please fill in all required fields')
            return
        }

        try {
            await addInventoryItem(employeeId, formData)
            toast.success('Inventory item added successfully!')
            setFormData({
                category_id: '',
                item_name: '',
                item_type: '',
                serial_number: '',
                assigned_date: new Date().toISOString().split('T')[0],
                condition: 'Good',
                notes: '',
            })
            setShowForm(false)
            loadInventory()
        } catch (error: any) {
            toast.error(error.message || 'Failed to add inventory item')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this inventory item?')) return

        try {
            await deleteInventoryItem(id)
            toast.success('Inventory item deleted successfully!')
            loadInventory()
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete inventory item')
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

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Inventory
                    </CardTitle>
                    {/* {!isInventoryVerified && (
                        <Button
                            onClick={() => setShowForm(!showForm)}
                            variant="outline"
                            size="sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Item
                        </Button>
                    )} */}
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

                <AnimatePresence>
                    {showForm && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={handleSubmit}
                            className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 space-y-4"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category_id">Category *</Label>
                                    <Select
                                        value={formData.category_id}
                                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => {
                                                const Icon = getCategoryIcon(category.icon)
                                                return (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="w-4 h-4" />
                                                            {category.name}
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="item_name">Item Name *</Label>
                                    <Input
                                        id="item_name"
                                        value={formData.item_name}
                                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                        placeholder="MacBook Pro 16-inch"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="item_type">Item Type</Label>
                                    <Input
                                        id="item_type"
                                        value={formData.item_type}
                                        onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                                        placeholder="Laptop"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="serial_number">Serial Number</Label>
                                    <Input
                                        id="serial_number"
                                        value={formData.serial_number}
                                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                        placeholder="SN12345678"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="assigned_date">Assigned Date</Label>
                                    <Input
                                        id="assigned_date"
                                        type="date"
                                        value={formData.assigned_date}
                                        onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="condition">Condition</Label>
                                    <Select
                                        value={formData.condition}
                                        onValueChange={(value) => setFormData({ ...formData, condition: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Excellent">Excellent</SelectItem>
                                            <SelectItem value="Good">Good</SelectItem>
                                            <SelectItem value="Fair">Fair</SelectItem>
                                            <SelectItem value="Poor">Poor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Additional information about this item"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Add Item</Button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : inventory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No inventory items assigned you yet.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(inventoryByCategory).map(([categoryName, items]) => {
                            const Icon = getCategoryIcon(items[0]?.category?.icon)
                            return (
                                <div key={categoryName} className="space-y-3">
                                    {/* <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Icon className="w-5 h-5" />
                                        {categoryName}
                                        <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                                    </h3> */}
                                    <div className="space-y-2">
                                        {items.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Image Thumbnail */}
                                                    {item.general_item?.image_url && (
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                                            <Image
                                                                src={item.general_item.image_url}
                                                                alt={item.item_name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="flex items-start justify-between flex-1">
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
                                                        {/* {!isInventoryVerified && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDelete(item.id)}
                                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )} */}
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
    )
}
