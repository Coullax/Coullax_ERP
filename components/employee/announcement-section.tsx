import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Bell, Info, Megaphone, ChevronDown, ChevronUp } from 'lucide-react'
import { getActiveAnnouncements, type Announcement } from '@/app/actions/announcement-actions'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

export function AnnouncementSection() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [showAll, setShowAll] = useState(false)

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const data = await getActiveAnnouncements()
                console.log(data)
                setAnnouncements(data)
            } catch (error) {
                console.error('Failed to load announcements:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchAnnouncements()
    }, [])

    if (loading) return null // Or a skeleton

    if (announcements.length === 0) return null

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'critical':
                return <AlertTriangle className="w-5 h-5 text-red-500" />
            case 'high':
                return <AlertTriangle className="w-5 h-5 text-orange-500" />
            case 'low':
                return <Info className="w-5 h-5 text-blue-500" />
            default:
                return <Megaphone className="w-5 h-5 text-gray-500" />
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'border-red-500 bg-red-50 dark:bg-red-900/10'
            case 'high':
                return 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
            case 'low':
                return 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
            default:
                return 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/10'
        }
    }

    const displayedAnnouncements = showAll ? announcements : announcements.slice(0, 3)

    return (
        <Card className="border-2 border-primary/10 bg-gradient-to-br from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <AnimatePresence initial={false}>
                    {displayedAnnouncements.map((announcement) => (
                        <motion.div
                            key={announcement.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div
                                className={`p-4 rounded-xl border-l-4 ${getPriorityColor(announcement.priority)}`}
                            >
                                <div className="flex items-start gap-3">
                                    {getPriorityIcon(announcement.priority)}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold text-lg">{announcement.title}</h4>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <div
                                            className="text-gray-600 dark:text-gray-300 text-sm prose dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: announcement.content }}
                                        />
                                        {announcement.priority === 'critical' && (
                                            <Badge variant="destructive" className="mt-2 text-xs">
                                                Critical
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {announcements.length > 3 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pt-2 flex justify-center"
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAll(!showAll)}
                            className="w-full text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5"
                        >
                            {showAll ? (
                                <>
                                    Show Less <ChevronUp className="w-4 h-4 ml-2" />
                                </>
                            ) : (
                                <>
                                    Show More ({announcements.length - 3} more) <ChevronDown className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    )
}
