'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
    Megaphone,
    Plus,
    MoreVertical,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    Clock,
} from 'lucide-react'
import {
    createAnnouncement,
    getAllAnnouncements,
    deleteAnnouncement,
    updateAnnouncementStatus,
    type Announcement,
} from '@/app/actions/announcement-actions'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form State
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [priority, setPriority] = useState('normal')
    const [publishNow, setPublishNow] = useState(false)

    const loadAnnouncements = async () => {
        try {
            setLoading(true)
            const data = await getAllAnnouncements()
            setAnnouncements(data)
        } catch (error) {
            toast.error('Failed to load announcements')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAnnouncements()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            await createAnnouncement({
                title,
                content,
                priority,
                status: publishNow ? 'published' : 'pending',
            })
            toast.success('Announcement created successfully')
            setCreateOpen(false)
            resetForm()
            loadAnnouncements()
        } catch (error: any) {
            toast.error(error.message || 'Failed to create announcement')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return

        try {
            await deleteAnnouncement(id)
            toast.success('Announcement deleted')
            loadAnnouncements()
        } catch (error) {
            toast.error('Failed to delete announcement')
        }
    }

    const handleStatusUpdate = async (id: string, newStatus: 'published' | 'pending') => {
        try {
            await updateAnnouncementStatus(id, newStatus)
            toast.success(`Announcement ${newStatus === 'published' ? 'published' : 'unpublished'}`)
            loadAnnouncements()
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const resetForm = () => {
        setTitle('')
        setContent('')
        setPriority('normal')
        setPublishNow(false)
    }

    const getPriorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
        }
        return (
            <Badge variant="outline" className={`border-0 ${styles[priority] || styles.normal} capitalize`}>
                {priority}
            </Badge>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Announcements</h1>
                    <p className="text-gray-500 mt-1">Manage company-wide announcements</p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Announcement
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Announcement</DialogTitle>
                            <DialogDescription>
                                Create a new announcement for all employees.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Office Maintenance"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="content">Content</Label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Enter announcement details..."
                                    className="min-h-[100px]"
                                    required
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox
                                    id="publish"
                                    checked={publishNow}
                                    onCheckedChange={(checked) => setPublishNow(checked as boolean)}
                                />
                                <Label htmlFor="publish" className="text-sm font-medium leading-none cursor-pointer">
                                    Publish immediately
                                </Label>
                            </div>
                            <p className="text-xs text-gray-500">
                                {publishNow
                                    ? "This announcement will be visible to all employees immediately."
                                    : "This announcement will be saved as pending and won't be visible until published."
                                }
                            </p>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create Announcement'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : announcements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        No announcements found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                announcements.map((announcement) => (
                                    <TableRow key={announcement.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                {announcement.title}
                                                <p className="text-xs text-gray-500 truncate max-w-[300px]">
                                                    {announcement.content}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getPriorityBadge(announcement.priority)}</TableCell>
                                        <TableCell>
                                            {announcement.status === 'published' ? (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-0">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    {announcement.status === 'pending' ? (
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(announcement.id, 'published')}>
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Publish
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(announcement.id, 'pending')}>
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Unpublish
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => handleDelete(announcement.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
