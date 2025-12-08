'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DocumentCategory, DocumentRequestType } from '@/lib/types/documents'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentRequestDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

const REQUEST_TYPES: { value: DocumentRequestType; label: string }[] = [
    { value: 'paysheet', label: 'Paysheet' },
    { value: 'salary_slip', label: 'Salary Slip' },
    { value: 'experience_letter', label: 'Experience Letter' },
    { value: 'relieving_letter', label: 'Relieving Letter' },
    { value: 'appointment_letter', label: 'Appointment Letter' },
    { value: 'tax_document', label: 'Tax Document' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'other', label: 'Other' },
]

export function DocumentRequestDialog({ open, onOpenChange, onSuccess }: DocumentRequestDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        request_type: '' as DocumentRequestType,
        title: '',
        description: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.request_type || !formData.title) {
            toast.error('Please fill in all required fields')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/documents/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!response.ok) throw new Error('Failed to create request')

            toast.success('Document request submitted successfully')
            onOpenChange(false)
            setFormData({ request_type: '' as DocumentRequestType, title: '', description: '' })
            onSuccess?.()
        } catch (error) {
            toast.error('Failed to submit request')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Request Document</DialogTitle>
                    <DialogDescription>
                        Request a document from the admin team. You'll be notified when it's ready.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="request_type">Document Type *</Label>
                        <Select
                            value={formData.request_type}
                            onValueChange={(value) => setFormData({ ...formData, request_type: value as DocumentRequestType })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent>
                                {REQUEST_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Request Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Paysheet for January 2024"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Additional Details</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Any specific requirements or notes..."
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Submit Request
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
