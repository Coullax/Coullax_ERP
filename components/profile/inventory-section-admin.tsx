'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { verifyEmployeeInventory } from '@/app/actions/inventory-actions'
import { Package, CheckCircle, Shield, ShieldCheck, Laptop, Phone, Key, Home, Briefcase, Pencil } from 'lucide-react'
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
    category?: {
        id: string
        name: string
        description?: string
        icon?: string
    }
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
    const user = useAuthStore((state) => state.user)

    // Check if inventory is verified
    const isInventoryVerified = inventory.length > 0 && inventory.every(item => item.isverified === true)

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
