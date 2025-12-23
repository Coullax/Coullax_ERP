'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getLatestHandbook, type EmployeeHandbook } from '@/app/actions/handbook-actions'
import { FileText, Download, ExternalLink, Loader2, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface EmployeeHandbookSectionProps {
    employeeId: string
}

export function EmployeeHandbookSection({ employeeId }: EmployeeHandbookSectionProps) {
    const [handbook, setHandbook] = useState<EmployeeHandbook | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchHandbook = async () => {
            setIsLoading(true)
            const result = await getLatestHandbook()

            if (result.success) {
                setHandbook(result.data)
            } else if (result.error) {
                toast.error(result.error)
            }

            setIsLoading(false)
        }

        fetchHandbook()
    }, [employeeId])

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return 'N/A'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    }

    const handleDownload = async () => {
        if (!handbook) return

        try {
            // Open in new tab for viewing/downloading
            window.open(handbook.file_url, '_blank')
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Failed to open handbook')
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" />
                    <p className="text-gray-500">Loading employee handbook...</p>
                </CardContent>
            </Card>
        )
    }

    if (!handbook) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                    <h3 className="text-lg font-semibold mb-2">No Handbook Available</h3>
                    <p className="text-gray-500 mb-4">
                        The employee handbook has not been uploaded yet. Please check back later or contact HR
                        for more information.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            {handbook.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {handbook.description || 'Official employee handbook for your reference'}
                        </CardDescription>
                    </div>
                    <Badge variant="default">Latest</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Handbook Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {handbook.version && (
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Version</div>
                            <div className="font-medium">{handbook.version}</div>
                        </div>
                    )}
                    <div>
                        <div className="text-xs text-gray-500 mb-1">File Size</div>
                        <div className="font-medium">{formatFileSize(handbook.file_size)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 mb-1">Last Updated</div>
                        <div className="font-medium">
                            {format(new Date(handbook.created_at), 'MMM dd, yyyy')}
                        </div>
                    </div>
                </div>

                {/* PDF Preview/Info */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                    <FileText className="w-20 h-20 mx-auto mb-4 text-blue-500" />
                    <h4 className="text-lg font-semibold mb-2">Employee Handbook PDF</h4>
                    <p className="text-sm text-gray-500 mb-6">
                        Click the button below to view or download the handbook
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Button onClick={handleDownload} size="lg">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Handbook
                        </Button>
                        <Button onClick={handleDownload} variant="outline" size="lg">
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                    </div>
                </div>

                {/* Additional Info */}
                {handbook.uploader && (
                    <div className="text-xs text-gray-500 text-center">
                        Uploaded by {handbook.uploader.full_name} on{' '}
                        {format(new Date(handbook.created_at), 'MMMM dd, yyyy')}
                    </div>
                )}

                {/* Important Notice */}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>📖 Important:</strong> Please read through the entire employee handbook to
                        understand company policies, procedures, and your rights and responsibilities as an
                        employee.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
