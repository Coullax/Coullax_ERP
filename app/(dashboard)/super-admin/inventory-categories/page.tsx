'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'
import {
    getInventoryCategories,
    addInventoryCategory,
    updateInventoryCategory,
    deleteInventoryCategory,
} from '@/app/actions/inventory-actions'
import { Plus, Edit, Trash2, Package } from 'lucide-react'

interface Category {
    id: string
    name: string
    description?: string
    icon?: string
}

export default function InventoryCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: '',
    })

    useEffect(() => {
        loadCategories()
    }, [])

    const loadCategories = async () => {
        try {
            const data = await getInventoryCategories()
            setCategories(data)
        } catch (error: any) {
            toast.error(error.message || 'Failed to load categories')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenDialog = (category?: Category) => {
        if (category) {
            setEditingCategory(category)
            setFormData({
                name: category.name,
                description: category.description || '',
                icon: category.icon || '',
            })
        } else {
            setEditingCategory(null)
            setFormData({
                name: '',
                description: '',
                icon: '',
            })
        }
        setIsDialogOpen(true)
    }

    const handleCloseDialog = () => {
        setIsDialogOpen(false)
        setEditingCategory(null)
        setFormData({
            name: '',
            description: '',
            icon: '',
        })
    }

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Category name is required')
            return
        }

        setSaving(true)
        try {
            if (editingCategory) {
                await updateInventoryCategory(editingCategory.id, {
                    name: formData.name,
                    description: formData.description || undefined,
                    icon: formData.icon || undefined,
                })
                toast.success('Category updated successfully!')
            } else {
                await addInventoryCategory({
                    name: formData.name,
                    description: formData.description || undefined,
                    icon: formData.icon || undefined,
                })
                toast.success('Category created successfully!')
            }
            handleCloseDialog()
            await loadCategories()
        } catch (error: any) {
            toast.error(error.message || 'Failed to save category')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) {
            return
        }

        setDeleting(id)
        try {
            await deleteInventoryCategory(id)
            toast.success('Category deleted successfully!')
            await loadCategories()
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete category')
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Inventory Categories</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Manage inventory categories for employee asset assignments
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Categories
                        </CardTitle>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Category
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No categories yet. Click "Add Category" to create one.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categories.map((category) => (
                                <motion.div
                                    key={category.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">{category.name}</h3>
                                            {category.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    {category.description}
                                                </p>
                                            )}
                                            {category.icon && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Icon: {category.icon}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenDialog(category)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(category.id)}
                                                disabled={deleting === category.id}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit' : 'Add'} Category
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory ? 'Update' : 'Create a new'} inventory category
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Category Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Electronics, Furniture"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of this category"
                                rows={3}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="icon">Icon Name (Optional)</Label>
                            <Input
                                id="icon"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                placeholder="e.g., laptop, phone, briefcase"
                            />
                            <p className="text-xs text-muted-foreground">
                                Lucide icon name for display
                            </p>
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
        </div>
    )
}
