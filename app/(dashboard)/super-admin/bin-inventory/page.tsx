"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Trash2, Package } from "lucide-react"
import { getBinInventory, deleteBinInventoryItem } from "@/app/actions/bin-inventory-actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function BinInventoryPage() {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<any>(null)
    const [deleting, setDeleting] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await getBinInventory()
            setItems(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load bin inventory")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleDeleteClick = (item: any) => {
        setItemToDelete(item)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return

        setDeleting(true)
        try {
            await deleteBinInventoryItem(itemToDelete.id)
            toast.success("Bin inventory record deleted successfully")
            await loadData()
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        } catch (error: any) {
            toast.error(error.message || "Failed to delete record")
        } finally {
            setDeleting(false)
        }
    }

    const formatDate = (date: string | null | undefined) => {
        if (!date) return "-"
        return format(new Date(date), "dd MMM yyyy")
    }

    const formatCurrency = (value: number | null | undefined) => {
        if (!value) return "-"
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value)
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Package className="h-8 w-8" />
                        Bin Inventory
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Permanently disposed/scrapped inventory items
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Inventory Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Disposed Items</CardTitle>
                    <CardDescription>
                        {loading ? "Loading..." : `${items.length} item(s) in bin inventory`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground mt-4">Loading bin inventory...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-muted/50">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No items in bin inventory</p>
                            <p className="text-sm text-muted-foreground mt-1">Disposed items will appear here</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Serial Number</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total Value</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Disposal Date</TableHead>
                                        <TableHead>Disposed By</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <div>{item.item_name}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {item.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {item.serial_number || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(item.total_value)}</TableCell>
                                            <TableCell>
                                                <div className="max-w-xs truncate" title={item.reason}>
                                                    {item.reason}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatDate(item.disposal_date)}</TableCell>
                                            <TableCell>
                                                {item.creator?.full_name || "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(item)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Bin Inventory Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this bin inventory record for "{itemToDelete?.item_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
