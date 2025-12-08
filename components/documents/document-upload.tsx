'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DocumentCategory } from '@/lib/types/documents'
import { Upload, X, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DocumentUploadProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    categories: DocumentCategory[]
    onSuccess?: (document?: any) => void
}

export function DocumentUpload({ open, onOpenChange, categories, onSuccess }: DocumentUploadProps) {
    const [loading, setLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category_id: '',
        is_public: false,
        tags: '',
    })

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
            if (!formData.title) {
                setFormData(prev => ({ ...prev, title: e.dataTransfer.files[0].name }))
            }
        }
    }, [formData.title])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            if (!formData.title) {
                setFormData(prev => ({ ...prev, title: e.target.files![0].name }))
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!file || !formData.title) {
            toast.error('Please select a file and provide a title')
            return
        }

        setLoading(true)

        try {
            const data = new FormData()
            data.append('file', file)
            data.append('title', formData.title)
            if (formData.description) data.append('description', formData.description)
            if (formData.category_id) data.append('category_id', formData.category_id)
            data.append('is_public', formData.is_public.toString())
            if (formData.tags) {
                const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                data.append('tags', JSON.stringify(tagsArray))
            }

            const response = await fetch('/api/documents', {
                method: 'POST',
                body: data,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to upload')
            }

            const result = await response.json()

            toast.success('Document uploaded successfully')
            onOpenChange(false)
            setFile(null)
            setFormData({ title: '', description: '', category_id: '', is_public: false, tags: '' })
            onSuccess?.(result.document)
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload document')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Upload a new document. Maximum file size is 50MB.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* File Upload Area */}
                    <div
                        className={cn(
                            'relative border-2 border-dashed rounded-xl p-8 transition-colors',
                            dragActive ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400',
                            file && 'border-green-500 bg-green-50'
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        />

                        {!file ? (
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center text-center">
                                    <Upload className="w-10 h-10 text-gray-400 mb-3" />
                                    <p className="text-sm font-medium mb-1">
                                        Click to upload or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 50MB)
                                    </p>
                                </div>
                            </label>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-8 h-8 text-green-600" />
                                    <div>
                                        <p className="font-medium text-sm">{file.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFile(null)}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Document title"
                                required
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the document"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category_id}
                                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tags">Tags (comma separated)</Label>
                            <Input
                                id="tags"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                placeholder="e.g., important, urgent"
                            />
                        </div>

                        <div className="col-span-2 flex items-center space-x-2">
                            <Checkbox
                                id="is_public"
                                checked={formData.is_public}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_public: checked as boolean })
                                }
                            />
                            <Label htmlFor="is_public" className="text-sm font-normal cursor-pointer">
                                Make this document public (visible to all employees)
                            </Label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loading || !file}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Upload Document
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
