'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarEventWithDetails } from '@/lib/types/calendar'
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    addMonths, 
    subMonths, 
    startOfWeek, 
    endOfWeek,
    isToday 
} from 'date-fns'

interface DashboardCalendarProps {
    events: CalendarEventWithDetails[]
    loading?: boolean
}

export function DashboardCalendar({ events, loading }: DashboardCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(currentMonth)
        const calendarStart = startOfWeek(monthStart)
        const calendarEnd = endOfWeek(monthEnd)

        return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    }, [currentMonth])

    // Get events for a specific day
    const getEventsForDay = (day: Date) => {
        return events.filter(event => {
            const eventStart = new Date(event.start_time)
            return isSameDay(eventStart, day)
        })
    }

    // Get events for selected date
    const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : []

    const previousMonth = () => setCurrentMonth(prev => subMonths(prev, 1))
    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))
    const goToToday = () => {
        setCurrentMonth(new Date())
        setSelectedDate(new Date())
    }

    if (loading) {
        return (
            <Card className="h-full">
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">Loading calendar...</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5" />
                        Events Calendar
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={previousMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToToday}>
                            Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    {format(currentMonth, 'MMMM yyyy')}
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                            {day}
                        </div>
                    ))}

                    {/* Calendar days */}
                    {calendarDays.map(day => {
                        const dayEvents = getEventsForDay(day)
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isSelected = selectedDate && isSameDay(day, selectedDate)
                        const isTodayDate = isToday(day)

                        return (
                            <div
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    'min-h-[50px] p-1 cursor-pointer rounded-lg transition-colors relative',
                                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                                    !isCurrentMonth && 'opacity-40',
                                    isSelected && 'bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500',
                                    isTodayDate && !isSelected && 'bg-gray-100 dark:bg-gray-800'
                                )}
                            >
                                <div className={cn(
                                    'text-sm font-medium text-center',
                                    isTodayDate && 'text-blue-600 font-bold'
                                )}>
                                    {format(day, 'd')}
                                </div>
                                {dayEvents.length > 0 && (
                                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                                        <div className="flex gap-0.5">
                                            {dayEvents.slice(0, 3).map((_, index) => (
                                                <div 
                                                    key={index} 
                                                    className="w-1 h-1 rounded-full bg-blue-500"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Selected Date Events */}
                {selectedDate && (
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">
                            {format(selectedDate, 'MMMM d, yyyy')}
                        </h4>
                        {selectedDateEvents.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No events for this date
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {selectedDateEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{event.title}</div>
                                                {event.description && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {event.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    {!event.is_all_day && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>
                                                                {format(new Date(event.start_time), 'h:mm a')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {event.location && (
                                                        <div className="flex items-center gap-1 truncate">
                                                            <MapPin className="w-3 h-3" />
                                                            <span className="truncate">{event.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge 
                                                variant={
                                                    event.status === 'confirmed' 
                                                        ? 'default' 
                                                        : event.status === 'tentative' 
                                                        ? 'secondary' 
                                                        : 'destructive'
                                                }
                                                className="shrink-0"
                                            >
                                                {event.status}
                                            </Badge>
                                        </div>
                                        {event.calendar && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <div 
                                                    className="w-2 h-2 rounded-full" 
                                                    style={{ backgroundColor: event.calendar.color }}
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    {event.calendar.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
