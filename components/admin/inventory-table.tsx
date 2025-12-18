"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, MoreVertical, ArrowRightLeft } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { deleteGeneralInventoryItem, type GeneralInventoryItem } from "@/app/actions/general-inventory-actions"
import { toast } from "sonner"
import { format } from "date-fns"

type InventoryTableProps = {
    items: GeneralInventoryItem[]
    onEdit: (item: GeneralInventoryItem) => void
    onTransfer: (item: GeneralInventoryItem) => void
    onDelete: () => void
}

export function InventoryTable({ items, onEdit, onTransfer, onDelete }: InventoryTableProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<GeneralInventoryItem | null>(null)
    const [deleting, setDeleting] = useState(false)

    const handleDeleteClick = (item: GeneralInventoryItem) => {
        setItemToDelete(item)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return

        setDeleting(true)
        try {
            await deleteGeneralInventoryItem(itemToDelete.id)
            toast.success("Inventory item deleted successfully")
            onDelete()
            setDeleteDialogOpen(false)
            setItemToDelete(null)
        } catch (error: any) {
            toast.error(error.message || "Failed to delete inventory item")
        } finally {
            setDeleting(false)
        }
    }

    const formatCurrency = (value: number | null | undefined) => {
        if (!value) return "-"
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value)
    }

    const formatDate = (date: string | null | undefined) => {
        if (!date) return "-"
        return format(new Date(date), "dd MMM yyyy")
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; className: string }> = {
            available: { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
            "in-use": { variant: "default", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
            maintenance: { variant: "default", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
            retired: { variant: "default", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
            disposed: { variant: "default", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
        }
        const config = variants[status] || variants.available
        return <Badge variant={config.variant} className={config.className}>{status.replace('-', ' ')}</Badge>
    }

    const getConditionBadge = (condition: string | null | undefined) => {
        if (!condition) return null
        const variants: Record<string, { variant: any; className: string }> = {
            new: { variant: "default", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
            good: { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
            fair: { variant: "default", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
            poor: { variant: "default", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
            damaged: { variant: "default", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
        }
        const config = variants[condition] || variants.good
        return <Badge variant={config.variant} className={config.className}>{condition}</Badge>
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
                <p className="text-muted-foreground">No inventory items found</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first item to get started</p>
            </div>
        )
    }

    return (
        <>
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
                            <TableHead>Location</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Purchase Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                    <div>
                                        <div>{item.item_name}</div>
                                        {item.description && (
                                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                                                {item.description}
                                            </div>
                                        )}
                                    </div>
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
                                <TableCell>{item.location || "-"}</TableCell>
                                <TableCell>{getStatusBadge(item.status)}</TableCell>
                                <TableCell>{getConditionBadge(item.condition)}</TableCell>
                                <TableCell>{formatDate(item.purchase_date)}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(item)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onTransfer(item)}>
                                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                Transfer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteClick(item)}
                                                className="text-red-600 focus:text-red-700"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{itemToDelete?.item_name}"? This action cannot be undone.
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
        </>
    )
}
