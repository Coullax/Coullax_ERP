'use client'

import { useState } from 'react'
import { Document } from '@/lib/types/documents'
import { DocumentCard } from './document-card'
import { Button } from '@/components/ui/button'
import { FileX, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentsListProps {
    documents: Document[]
    loading?: boolean
    onRefresh?: () => void
}

export function DocumentsList({ documents, loading, onRefresh }: DocumentsListProps) {
    const handleView = (document: Document) => {
        window.open(document.file_url, '_blank')
    }

    const handleDownload = async (document: Document) => {
        try {
            const response = await fetch(document.file_url)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = window.document.createElement('a')
            a.href = url
            a.download = document.title
            window.document.body.appendChild(a)
            a.click()
            window.document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
            toast.success('Document downloaded')
        } catch (error) {
            toast.error('Failed to download document')
        }
    }

    const handleDelete = async (document: Document) => {
        if (!confirm('Are you sure you want to delete this document?')) return

        try {
            const response = await fetch(`/api/documents/${document.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete')

            toast.success('Document deleted')
            onRefresh?.()
        } catch (error) {
            toast.error('Failed to delete document')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    if (documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <FileX className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Get started by uploading your first document
                </p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((document) => (
                <DocumentCard
                    key={document.id}
                    document={document}
                    onView={handleView}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    )
}
