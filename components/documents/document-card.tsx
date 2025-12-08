'use client'

import { Document } from '@/lib/types/documents'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    FileText,
    Download,
    Eye,
    Trash2,
    MoreVertical,
    File,
    Image as ImageIcon,
    FileSpreadsheet,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DocumentCardProps {
    document: Document
    onView?: (document: Document) => void
    onDownload?: (document: Document) => void
    onDelete?: (document: Document) => void
}

const getFileIcon = (fileType: string | null) => {
    if (!fileType) return FileText

    if (fileType.includes('pdf')) return FileText
    if (fileType.includes('image')) return ImageIcon
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet
    return File
}

const getFileTypeColor = (fileType: string | null) => {
    if (!fileType) return 'bg-gray-100 text-gray-600'

    if (fileType.includes('pdf')) return 'bg-red-100 text-red-600'
    if (fileType.includes('image')) return 'bg-blue-100 text-blue-600'
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'bg-green-100 text-green-600'
    if (fileType.includes('word') || fileType.includes('document')) return 'bg-indigo-100 text-indigo-600'
    return 'bg-gray-100 text-gray-600'
}

const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
}

export function DocumentCard({ document, onView, onDownload, onDelete }: DocumentCardProps) {
    const Icon = getFileIcon(document.file_type)
    const fileTypeColor = getFileTypeColor(document.file_type)

    return (
        <Card className="group relative hover:shadow-lg transition-all duration-200 overflow-hidden">
            <div className="p-4">
                {/* File Icon & Type Badge */}
                <div className="flex items-start justify-between mb-3">
                    <div className={cn('p-3 rounded-xl', fileTypeColor)}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {document.category && (
                        <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: `var(--${document.category.color}-100)` }}
                        >
                            {document.category.name}
                        </Badge>
                    )}
                </div>

                {/* Document Details */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                        {document.title}
                    </h3>

                    {document.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                            {document.description}
                        </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(document.file_size)}</span>
                        <span>•</span>
                        <span>v{document.version}</span>
                        {document.uploader && (
                            <>
                                <span>•</span>
                                <span className="truncate">{document.uploader.full_name}</span>
                            </>
                        )}
                    </div>

                    <div className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                    </div>

                    {/* Tags */}
                    {document.tags && document.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                            {document.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                                    {tag}
                                </Badge>
                            ))}
                            {document.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs px-2 py-0">
                                    +{document.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    {onView && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(document)}
                            className="flex-1 h-8 text-xs"
                        >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                        </Button>
                    )}
                    {onDownload && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDownload(document)}
                            className="flex-1 h-8 text-xs"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(document)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Public indicator */}
            {document.is_public && (
                <div className="absolute top-2 right-2">
                    <Badge variant="success" className="text-xs">
                        Public
                    </Badge>
                </div>
            )}
        </Card>
    )
}
