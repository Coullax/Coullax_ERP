"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addGeneralInventoryItem, updateGeneralInventoryItem, type GeneralInventoryItem } from "@/app/actions/general-inventory-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type InventoryDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    item?: GeneralInventoryItem | null
    onSuccess: () => void
}

export function InventoryDialog({ open, onOpenChange, item, onSuccess }: InventoryDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        item_name: item?.item_name || "",
        category: item?.category || "equipment",
        description: item?.description || "",
        serial_number: item?.serial_number || "",
        quantity: item?.quantity?.toString() || "1",
        unit_price: item?.unit_price?.toString() || "",
        location: item?.location || "",
        condition: item?.condition || "good",
        status: item?.status || "available",
        purchase_date: item?.purchase_date || "",
        warranty_expiry: item?.warranty_expiry || "",
        supplier: item?.supplier || "",
        notes: item?.notes || "",
    })

    // Update form data when item changes (for editing different items)
    useEffect(() => {
        if (item) {
            setFormData({
                item_name: item.item_name || "",
                category: item.category || "equipment",
                description: item.description || "",
                serial_number: item.serial_number || "",
                quantity: item.quantity?.toString() || "1",
                unit_price: item.unit_price?.toString() || "",
                location: item.location || "",
                condition: item.condition || "good",
                status: item.status || "available",
                purchase_date: item.purchase_date || "",
                warranty_expiry: item.warranty_expiry || "",
                supplier: item.supplier || "",
                notes: item.notes || "",
            })
        } else {
            // Reset form for adding new item
            setFormData({
                item_name: "",
                category: "equipment",
                description: "",
                serial_number: "",
                quantity: "1",
                unit_price: "",
                location: "",
                condition: "good",
                status: "available",
                purchase_date: "",
                warranty_expiry: "",
                supplier: "",
                notes: "",
            })
        }
    }, [item])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const data = {
                item_name: formData.item_name,
                category: formData.category,
                description: formData.description || undefined,
                serial_number: formData.serial_number || undefined,
                quantity: parseInt(formData.quantity) || 1,
                unit_price: formData.unit_price ? parseFloat(formData.unit_price) : undefined,
                location: formData.location || undefined,
                condition: formData.condition || undefined,
                status: formData.status,
                purchase_date: formData.purchase_date || undefined,
                warranty_expiry: formData.warranty_expiry || undefined,
                supplier: formData.supplier || undefined,
                notes: formData.notes || undefined,
            }

            if (item?.id) {
                await updateGeneralInventoryItem(item.id, data)
                toast.success("Inventory item updated successfully")
            } else {
                await addGeneralInventoryItem(data)
                toast.success("Inventory item added successfully")
            }

            onSuccess()
            onOpenChange(false)

            // Reset form
            setFormData({
                item_name: "",
                category: "equipment",
                description: "",
                serial_number: "",
                quantity: "1",
                unit_price: "",
                location: "",
                condition: "good",
                status: "available",
                purchase_date: "",
                warranty_expiry: "",
                supplier: "",
                notes: "",
            })
        } catch (error: any) {
            toast.error(error.message || "Failed to save inventory item")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{item ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
                    <DialogDescription>
                        {item ? "Update the details of this inventory item." : "Add a new item to the general inventory."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Item Name */}
                        <div className="col-span-2">
                            <Label htmlFor="item_name">Item Name *</Label>
                            <Input
                                id="item_name"
                                value={formData.item_name}
                                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                placeholder="e.g., Office Desk, Laptop, Whiteboard"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <Label htmlFor="category">Category *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value as 'furniture' | 'equipment' | 'supplies' | 'electronics' | 'appliances' | 'tools' | 'vehicles' | 'other' })}
                            >
                                <SelectTrigger id="category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
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

                        {/* Serial Number */}
                        <div>
                            <Label htmlFor="serial_number">Serial Number</Label>
                            <Input
                                id="serial_number"
                                value={formData.serial_number}
                                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                placeholder="e.g., SN12345"
                            />
                        </div>

                        {/* Quantity */}
                        <div>
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="0"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                required
                            />
                        </div>

                        {/* Unit Price */}
                        <div>
                            <Label htmlFor="unit_price">Unit Price ($)</Label>
                            <Input
                                id="unit_price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.unit_price}
                                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>

                        {/* Location */}
                        <div className="col-span-2">
                            <Label htmlFor="location">Location / Department</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g., Floor 2, Room 205, Storage Area A"
                            />
                        </div>

                        {/* Condition */}
                        <div>
                            <Label htmlFor="condition">Condition</Label>
                            <Select
                                value={formData.condition}
                                onValueChange={(value) => setFormData({ ...formData, condition: value as 'new' | 'good' | 'fair' | 'poor' | 'damaged' })}
                            >
                                <SelectTrigger id="condition">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="good">Good</SelectItem>
                                    <SelectItem value="fair">Fair</SelectItem>
                                    <SelectItem value="poor">Poor</SelectItem>
                                    <SelectItem value="damaged">Damaged</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div>
                            <Label htmlFor="status">Status *</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value as 'available' | 'in-use' | 'maintenance' | 'retired' | 'disposed' })}
                            >
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="in-use">In Use</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="retired">Retired</SelectItem>
                                    <SelectItem value="disposed">Disposed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Purchase Date */}
                        <div>
                            <Label htmlFor="purchase_date">Purchase Date</Label>
                            <Input
                                id="purchase_date"
                                type="date"
                                value={formData.purchase_date}
                                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                            />
                        </div>

                        {/* Warranty Expiry */}
                        <div>
                            <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                            <Input
                                id="warranty_expiry"
                                type="date"
                                value={formData.warranty_expiry}
                                onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                            />
                        </div>

                        {/* Supplier */}
                        <div className="col-span-2">
                            <Label htmlFor="supplier">Supplier</Label>
                            <Input
                                id="supplier"
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                placeholder="e.g., ABC Suppliers, XYZ Corporation"
                            />
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Detailed description of the item..."
                                rows={2}
                            />
                        </div>

                        {/* Notes */}
                        <div className="col-span-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional notes or comments..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {item ? "Update Item" : "Add Item"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
