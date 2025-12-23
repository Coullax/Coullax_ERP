'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { HandbookUploadDialog } from './handbook-upload-dialog'
import {
    getAllHandbooks,
    deleteHandbook,
    updateHandbookStatus,
    type EmployeeHandbook,
} from '@/app/actions/handbook-actions'
import { toast } from 'sonner'
import { FileText, Trash2, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export function HandbookManagementSection() {
    const [handbooks, setHandbooks] = useState<EmployeeHandbook[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const fetchHandbooks = async () => {
        setIsLoading(true)
        const result = await getAllHandbooks()
        if (result.success && result.data) {
            setHandbooks(result.data)
        } else {
            toast.error(result.error || 'Failed to fetch handbooks')
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchHandbooks()
    }, [])

    const handleDelete = async () => {
        if (!deleteId) return

        setIsDeleting(true)
        const result = await deleteHandbook(deleteId)

        if (result.success) {
            toast.success('Handbook deleted successfully')
            setHandbooks((prev) => prev.filter((h) => h.id !== deleteId))
        } else {
            toast.error(result.error || 'Failed to delete handbook')
        }

        setIsDeleting(false)
        setDeleteId(null)
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id)
        const result = await updateHandbookStatus(id, !currentStatus)

        if (result.success) {
            toast.success(`Handbook ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
            setHandbooks((prev) =>
                prev.map((h) => (h.id === id ? { ...h, is_active: !currentStatus } : h))
            )
        } else {
            toast.error(result.error || 'Failed to update handbook')
        }

        setTogglingId(null)
    }

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return 'N/A'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" />
                    <p className="text-gray-500">Loading handbooks...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Employee Handbook Management</CardTitle>
                        <CardDescription>
                            Upload and manage employee handbooks. The latest active handbook will be shown to
                            employees.
                        </CardDescription>
                    </div>
                    <HandbookUploadDialog onUploadSuccess={fetchHandbooks} />
                </CardHeader>
                <CardContent>
                    {handbooks.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-500 mb-4">No handbooks uploaded yet</p>
                            <HandbookUploadDialog
                                onUploadSuccess={fetchHandbooks}
                                trigger={<Button>Upload First Handbook</Button>}
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Version</TableHead>
                                        <TableHead>File Size</TableHead>
                                        <TableHead>Uploaded By</TableHead>
                                        <TableHead>Upload Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {handbooks.map((handbook) => (
                                        <TableRow key={handbook.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-500" />
                                                    {handbook.title}
                                                </div>
                                                {handbook.description && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {handbook.description}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>{handbook.version || 'N/A'}</TableCell>
                                            <TableCell>{formatFileSize(handbook.file_size)}</TableCell>
                                            <TableCell>
                                                {handbook.uploader?.full_name || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(handbook.created_at), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={handbook.is_active ? 'default' : 'secondary'}>
                                                    {handbook.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(handbook.file_url, '_blank')}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(handbook.id, handbook.is_active)}
                                                        disabled={togglingId === handbook.id}
                                                    >
                                                        {togglingId === handbook.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : handbook.is_active ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteId(handbook.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this handbook. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
