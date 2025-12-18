"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { moveToBin } from "@/app/actions/bin-inventory-actions"
import { moveToMaintenance } from "@/app/actions/maintenance-inventory-actions"
import { type GeneralInventoryItem } from "@/app/actions/general-inventory-actions"
import { toast } from "sonner"
import { Loader2, Package, Wrench } from "lucide-react"

type TransferDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: GeneralInventoryItem | null
    onSuccess: () => void
}

type Destination = "bin" | "maintenance"

export function TransferDialog({ open, onOpenChange, item, onSuccess }: TransferDialogProps) {
    const [loading, setLoading] = useState(false)
    const [destination, setDestination] = useState<Destination>("maintenance")
    const [formData, setFormData] = useState({
        quantity: "1",
        reason: "",
        issueDescription: "",
        expectedCompletionDate: "",
        repairNotes: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!item) return

        setLoading(true)

        try {
            const quantity = parseInt(formData.quantity)

            if (quantity <= 0) {
                throw new Error("Quantity must be greater than 0")
            }

            if (quantity > item.quantity) {
                throw new Error(`Cannot transfer more than available quantity (${item.quantity})`)
            }

            if (destination === "bin") {
                if (!formData.reason.trim()) {
                    throw new Error("Please provide a reason for disposal")
                }

                await moveToBin({
                    generalInventoryId: item.id,
                    quantity,
                    reason: formData.reason,
                })

                toast.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} moved to bin inventory`)
            } else {
                if (!formData.issueDescription.trim()) {
                    throw new Error("Please provide an issue description")
                }

                await moveToMaintenance({
                    generalInventoryId: item.id,
                    quantity,
                    issueDescription: formData.issueDescription,
                    expectedCompletionDate: formData.expectedCompletionDate || undefined,
                    repairNotes: formData.repairNotes || undefined,
                })

                toast.success(`${quantity} ${quantity === 1 ? 'item' : 'items'} moved to maintenance inventory`)
            }

            onSuccess()
            onOpenChange(false)

            // Reset form
            setFormData({
                quantity: "1",
                reason: "",
                issueDescription: "",
                expectedCompletionDate: "",
                repairNotes: "",
            })
        } catch (error: any) {
            toast.error(error.message || "Failed to transfer items")
        } finally {
            setLoading(false)
        }
    }

    if (!item) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Transfer Inventory Item</DialogTitle>
                    <DialogDescription>
                        Transfer "{item.item_name}" to bin or maintenance inventory
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Available Quantity Info */}
                    <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            Available quantity: <span className="font-semibold text-foreground">{item.quantity}</span>
                        </p>
                    </div>

                    {/* Destination Selection */}
                    <div className="space-y-3">
                        <Label>Transfer Destination *</Label>
                        <RadioGroup value={destination} onValueChange={(value) => setDestination(value as Destination)}>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                                <RadioGroupItem value="maintenance" id="maintenance" />
                                <Label htmlFor="maintenance" className="flex items-center gap-2 cursor-pointer flex-1">
                                    <Wrench className="h-4 w-4" />
                                    <div>
                                        <div className="font-medium">Maintenance Inventory</div>
                                        <div className="text-xs text-muted-foreground">For items under repair (can be returned)</div>
                                    </div>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                                <RadioGroupItem value="bin" id="bin" />
                                <Label htmlFor="bin" className="flex items-center gap-2 cursor-pointer flex-1">
                                    <Package className="h-4 w-4" />
                                    <div>
                                        <div className="font-medium">Bin Inventory</div>
                                        <div className="text-xs text-muted-foreground">For permanently disposed items</div>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Quantity */}
                    <div>
                        <Label htmlFor="quantity">Quantity to Transfer *</Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                        />
                    </div>

                    {/* Conditional Fields based on Destination */}
                    {destination === "bin" ? (
                        <>
                            <div>
                                <Label htmlFor="reason">Reason for Disposal *</Label>
                                <Textarea
                                    id="reason"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="e.g., Damaged beyond repair, Obsolete, End of life..."
                                    rows={3}
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <Label htmlFor="issueDescription">Issue Description *</Label>
                                <Textarea
                                    id="issueDescription"
                                    value={formData.issueDescription}
                                    onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                                    placeholder="Describe the issue or reason for maintenance..."
                                    rows={3}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="expectedCompletionDate">Expected Completion Date</Label>
                                <Input
                                    id="expectedCompletionDate"
                                    type="date"
                                    value={formData.expectedCompletionDate}
                                    onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="repairNotes">Initial Repair Notes</Label>
                                <Textarea
                                    id="repairNotes"
                                    value={formData.repairNotes}
                                    onChange={(e) => setFormData({ ...formData, repairNotes: e.target.value })}
                                    placeholder="Any initial notes about the repair process..."
                                    rows={2}
                                />
                            </div>
                        </>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Transfer Items
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
