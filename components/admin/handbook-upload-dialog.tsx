'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { uploadEmployeeHandbook } from '@/app/actions/handbook-actions'
import { toast } from 'sonner'
import { Upload, FileText, Loader2 } from 'lucide-react'

interface HandbookUploadDialogProps {
    onUploadSuccess?: () => void
    trigger?: React.ReactNode
}

export function HandbookUploadDialog({
    onUploadSuccess,
    trigger,
}: HandbookUploadDialogProps) {
    const [open, setOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [version, setVersion] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.type !== 'application/pdf') {
                toast.error('Only PDF files are allowed')
                return
            }
            setSelectedFile(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedFile || !title) {
            toast.error('Please provide a file and title')
            return
        }

        setIsUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('title', title)
            formData.append('description', description)
            formData.append('version', version)

            const result = await uploadEmployeeHandbook(formData)

            if (result.success) {
                toast.success('Employee handbook uploaded successfully')
                setOpen(false)
                resetForm()
                onUploadSuccess?.()
            } else {
                toast.error(result.error || 'Failed to upload handbook')
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsUploading(false)
        }
    }

    const resetForm = () => {
        setSelectedFile(null)
        setTitle('')
        setDescription('')
        setVersion('')
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Handbook
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Upload Employee Handbook</DialogTitle>
                    <DialogDescription>
                        Upload a PDF file for the employee handbook. This will be available to all
                        employees in their profile.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label htmlFor="file">PDF File *</Label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                                <input
                                    id="file"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="file"
                                    className="cursor-pointer flex flex-col items-center gap-2"
                                >
                                    {selectedFile ? (
                                        <>
                                            <FileText className="w-12 h-12 text-blue-500" />
                                            <div className="text-sm font-medium">{selectedFile.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {formatFileSize(selectedFile.size)}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-12 h-12 text-gray-400" />
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Click to select a PDF file
                                            </div>
                                            <div className="text-xs text-gray-500">PDF only, max 50MB</div>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Employee Handbook 2024"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        {/* Version */}
                        <div className="space-y-2">
                            <Label htmlFor="version">Version</Label>
                            <Input
                                id="version"
                                placeholder="e.g., v1.0, 2024.1"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of the handbook or what's new in this version"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isUploading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isUploading || !selectedFile || !title}>
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
