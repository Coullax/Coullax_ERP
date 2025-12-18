"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Filter, RefreshCw } from "lucide-react"
import { getGeneralInventory, getInventoryStats, type GeneralInventoryItem } from "@/app/actions/general-inventory-actions"
import { InventoryStats } from "@/components/admin/inventory-stats"
import { InventoryTable } from "@/components/admin/inventory-table"
import { InventoryDialog } from "@/components/admin/inventory-dialog"
import { TransferDialog } from "@/components/admin/transfer-dialog"
import { toast } from "sonner"

export default function GeneralInventoryPage() {
    const [items, setItems] = useState<GeneralInventoryItem[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [conditionFilter, setConditionFilter] = useState<string>("all")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<GeneralInventoryItem | null>(null)
    const [transferDialogOpen, setTransferDialogOpen] = useState(false)
    const [transferItem, setTransferItem] = useState<GeneralInventoryItem | null>(null)

    const loadData = async () => {
        setLoading(true)
        try {
            const filters = {
                category: categoryFilter !== "all" ? categoryFilter : undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                condition: conditionFilter !== "all" ? conditionFilter : undefined,
                searchQuery: searchQuery || undefined,
            }

            const [inventoryData, statsData] = await Promise.all([
                getGeneralInventory(filters),
                getInventoryStats()
            ])

            setItems(inventoryData)
            setStats(statsData)
        } catch (error: any) {
            toast.error(error.message || "Failed to load inventory data")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleSearch = () => {
        loadData()
    }

    const handleReset = () => {
        setSearchQuery("")
        setCategoryFilter("all")
        setStatusFilter("all")
        setConditionFilter("all")
        setTimeout(loadData, 0)
    }

    const handleAddItem = () => {
        setEditingItem(null)
        setDialogOpen(true)
    }

    const handleEditItem = (item: GeneralInventoryItem) => {
        setEditingItem(item)
        setDialogOpen(true)
    }

    const handleDialogSuccess = () => {
        loadData()
    }

    const handleTransferItem = (item: GeneralInventoryItem) => {
        setTransferItem(item)
        setTransferDialogOpen(true)
    }

    const handleTransferSuccess = () => {
        loadData()
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">General Inventory</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage office-wide inventory items like furniture, equipment, and supplies
                    </p>
                </div>
                <Button onClick={handleAddItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Inventory Item
                </Button>
            </div>

            {/* Statistics */}
            {stats && <InventoryStats stats={stats} />}

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filters & Search
                    </CardTitle>
                    <CardDescription>
                        Filter and search inventory items
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="lg:col-span-2">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, serial number, or description..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="furniture">Furniture</SelectItem>
                                    <SelectItem value="equipment">Equipment</SelectItem>
                                    <SelectItem value="supplies">Supplies</SelectItem>
                                    <SelectItem value="electronics">Electronics</SelectItem>
                                    <SelectItem value="appliances">Appliances</SelectItem>
                                    <SelectItem value="tools">Tools</SelectItem>
                                    <SelectItem value="vehicles">Vehicles</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="in-use">In Use</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="retired">Retired</SelectItem>
                                    <SelectItem value="disposed">Disposed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Condition Filter */}
                        <div>
                            <Select value={conditionFilter} onValueChange={setConditionFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Conditions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Conditions</SelectItem>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="good">Good</SelectItem>
                                    <SelectItem value="fair">Fair</SelectItem>
                                    <SelectItem value="poor">Poor</SelectItem>
                                    <SelectItem value="damaged">Damaged</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleSearch} disabled={loading}>
                            <Search className="mr-2 h-4 w-4" />
                            Search
                        </Button>
                        <Button variant="outline" onClick={handleReset} disabled={loading}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Inventory Items</CardTitle>
                    <CardDescription>
                        {loading ? "Loading..." : `${items.length} item(s) found`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground mt-4">Loading inventory...</p>
                        </div>
                    ) : (
                        <InventoryTable
                            items={items}
                            onEdit={handleEditItem}
                            onTransfer={handleTransferItem}
                            onDelete={loadData}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <InventoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                item={editingItem}
                onSuccess={handleDialogSuccess}
            />

            {/* Transfer Dialog */}
            <TransferDialog
                open={transferDialogOpen}
                onOpenChange={setTransferDialogOpen}
                item={transferItem}
                onSuccess={handleTransferSuccess}
            />
        </div>
    )
}
