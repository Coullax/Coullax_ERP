"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Trash2, Wrench, ArrowLeft, Loader2 } from "lucide-react"
import { getMaintenanceInventory, returnFromMaintenance, updateMaintenanceStatus, deleteMaintenanceInventoryItem } from "@/app/actions/maintenance-inventory-actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function MaintenanceInventoryPage() {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<any>(null)
    const [deleting, setDeleting] = useState(false)
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
    const [itemToUpdate, setItemToUpdate] = useState<any>(null)
    const [updating, setUpdating] = useState(false)
    const [updateForm, setUpdateForm] = useState({
        status: "",
        repairNotes: "",
    })

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await getMaintenanceInventory(false) // Don't include returned items
            setItems(data)
        } catch (error: any) {
            toast.error(error.message || "Failed to load maintenance inventory")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleReturnToInventory = async (item: any) => {
        try {
            await returnFromMaintenance(item.id)
            toast.success("Item returned to general inventory successfully")
            await loadData()
        } catch (error: any) {
            toast.error(error.message || "Failed to return item")
        }
    }

    const handleUpdateClick = (item: any) => {
        setItemToUpdate(item)
        setUpdateForm({
            status: item.status,
            repairNotes: item.repair_notes || "",
        })
        setUpdateDialogOpen(true)
    }

    const handleUpdateSubmit = async () => {
        if (!itemToUpdate) return

        setUpdating(true)
        try {
            await updateMaintenanceStatus(itemToUpdate.id, {
                status: updateForm.status as any,
                repairNotes: updateForm.repairNotes || undefined,
            })
            toast.success("Maintenance status updated successfully")
            await loadData()
            setUpdateDialogOpen(false)
            setItemToUpdate(null)
        } catch (error: any) {
            toast.error(error.message || "Failed to update status")
        } finally {
            setUpdating(false)
        }
    }

    const handleDeleteClick = (item: any) => {
        setItemToDelete(item)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return

        setDeleting(true)
        try {
            await deleteMaintenanceInventoryItem(itemToDelete.id)
            toast.success("Maintenance inventory record deleted successfully")
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

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { className: string }> = {
            pending: { className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
            in_progress: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
            completed: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
            returned: { className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
        }
        const config = variants[status] || variants.pending
        return <Badge variant="default" className={config.className}>{status.replace('_', ' ')}</Badge>
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Wrench className="h-8 w-8" />
                        Maintenance Inventory
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Items under maintenance or repair
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
                    <CardTitle>Maintenance Items</CardTitle>
                    <CardDescription>
                        {loading ? "Loading..." : `${items.length} item(s) in maintenance`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground mt-4">Loading maintenance inventory...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-muted/50">
                            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No items in maintenance</p>
                            <p className="text-sm text-muted-foreground mt-1">Items under repair will appear here</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Serial Number</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead>Issue</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Expected Date</TableHead>
                                        <TableHead>Moved Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.item_name}
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
                                            <TableCell>
                                                <div className="max-w-xs truncate" title={item.issue_description}>
                                                    {item.issue_description}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell>{formatDate(item.expected_completion_date)}</TableCell>
                                            <TableCell>{formatDate(item.moved_to_maintenance_date)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUpdateClick(item)}
                                                    >
                                                        Update
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => handleReturnToInventory(item)}
                                                    >
                                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                                        Return
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(item)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Update Status Dialog */}
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Maintenance Status</DialogTitle>
                        <DialogDescription>
                            Update the status and notes for "{itemToUpdate?.item_name}"
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}>
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="repairNotes">Repair Notes</Label>
                            <Textarea
                                id="repairNotes"
                                value={updateForm.repairNotes}
                                onChange={(e) => setUpdateForm({ ...updateForm, repairNotes: e.target.value })}
                                placeholder="Add notes about the repair progress..."
                                rows={4}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpdateDialogOpen(false)} disabled={updating}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateSubmit} disabled={updating}>
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Maintenance Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this maintenance record for "{itemToDelete?.item_name}"? This action cannot be undone.
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
