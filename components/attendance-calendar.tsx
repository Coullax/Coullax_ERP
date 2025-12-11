'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, LogIn, LogOut, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatTime } from '@/lib/utils'
import { CheckCircle, XCircle, Coffee, Clock } from 'lucide-react'

interface AttendanceLog {
    id: string
    date: string
    check_in?: string
    check_out?: string
    status: string
    notes?: string
}

interface LeaveRequest {
    id: string
    leave_type: string
    start_date: string
    end_date: string
    total_days: number
    reason: string
    request: {
        id: string
        status: string
        submitted_at: string
        reviewed_at?: string
        review_notes?: string
    }
}

interface AttendanceCalendarProps {
    logs: AttendanceLog[]
    leaves: LeaveRequest[]
}

export function AttendanceCalendar({ logs, leaves }: AttendanceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Convert logs array to a map for quick lookup
    const logsMap = new Map(logs.map((log) => [log.date, log]))

    // Create leave map for quick lookup by date
    const leavesMap = new Map<string, LeaveRequest[]>()
    leaves.forEach((leave) => {
        const startDate = new Date(leave.start_date)
        const endDate = new Date(leave.end_date)
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0]
            if (!leavesMap.has(dateStr)) {
                leavesMap.set(dateStr, [])
            }
            leavesMap.get(dateStr)!.push(leave)
        }
    })

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            present: 'bg-green-500',
            absent: 'bg-red-500',
            leave: 'bg-blue-500',
            half_day: 'bg-yellow-500',
        }
        return colors[status] || 'bg-gray-500'
    }

    const getStatusIcon = (status: string) => {
        const icons: Record<string, any> = {
            present: CheckCircle,
            absent: XCircle,
            leave: Coffee,
            half_day: Clock,
        }
        return icons[status] || Clock
    }

    const calculateWorkingHours = (checkIn: string, checkOut: string) => {
        const [inHours, inMinutes] = checkIn.split(':').map(Number)
        const [outHours, outMinutes] = checkOut.split(':').map(Number)

        const inTotalMinutes = inHours * 60 + inMinutes
        const outTotalMinutes = outHours * 60 + outMinutes

        const totalMinutes = outTotalMinutes - inTotalMinutes
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60

        return `${hours}h ${minutes}m`
    }

    const getLeaveStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            approved: 'bg-green-100 text-green-800 border-green-300',
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            rejected: 'bg-red-100 text-red-800 border-red-300',
        }
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
    }

    const handleDateClick = (dateStr: string) => {
        const log = logsMap.get(dateStr)
        const dateLeaves = leavesMap.get(dateStr)
        if (log || dateLeaves) {
            setSelectedDate(dateStr)
            setIsModalOpen(true)
        }
    }

    // Get calendar data
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    // Navigate months
    const previousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Generate calendar days
    const calendarDays = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day)
    }

    return (
        <div className="w-full">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                    {monthNames[month]} {year}
                </h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={previousMonth}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={nextMonth}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map((day) => (
                    <div
                        key={day}
                        className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="min-h-[80px] sm:aspect-square" />
                    }

                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const log = logsMap.get(dateStr)
                    const dateLeaves = leavesMap.get(dateStr) || []
                    const isToday =
                        day === new Date().getDate() &&
                        month === new Date().getMonth() &&
                        year === new Date().getFullYear()
                    const hasData = log || dateLeaves.length > 0

                    return (
                        <div
                            key={day}
                            onClick={() => hasData && handleDateClick(dateStr)}
                            className={`
                min-h-[80px] sm:aspect-square p-1 sm:p-2 rounded-lg border-2 transition-all overflow-hidden
                ${isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-800'}
                ${hasData ? 'hover:shadow-lg cursor-pointer hover:border-blue-400' : ''}
              `}
                        >
                            <div className="h-full flex flex-col overflow-hidden">
                                {/* Day Number */}
                                <div className={`text-xs sm:text-sm font-semibold mb-1 flex-shrink-0 ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                                    {day}
                                </div>

                                {/* Leave Indicators */}
                                {dateLeaves.length > 0 && (
                                    <div className="space-y-1 mb-1">
                                        {dateLeaves.map((leave) => (
                                            <div
                                                key={leave.id}
                                                className={`text-[8px] sm:text-[10px] px-1 py-0.5 rounded border ${getLeaveStatusColor(leave.request.status)} font-medium flex items-center justify-between gap-1`}
                                            >
                                                <span className="truncate">{leave.leave_type}</span>
                                                <span className="flex-shrink-0">
                                                    {leave.request.status === 'approved' && '✓'}
                                                    {leave.request.status === 'pending' && '⏱'}
                                                    {leave.request.status === 'rejected' && '✗'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Attendance Info */}
                                {log && (
                                    <>
                                        {/* Simplified view for small screens */}
                                        <div className="flex-1 flex flex-col gap-0.5 sm:hidden overflow-hidden">
                                            {/* Status Dot */}
                                            <div className="flex items-center justify-center flex-shrink-0">
                                                <div className={`w-2 h-2 rounded-full ${getStatusColor(log.status)}`} />
                                            </div>
                                            {/* Compact time indicators */}
                                            <div className="space-y-0.5 overflow-hidden">
                                                {log.check_in && (
                                                    <div className="flex items-center gap-0.5 overflow-hidden">
                                                        <LogIn className="w-2 h-2 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                        <span className="text-[8px] font-semibold text-green-700 dark:text-green-300 truncate">
                                                            {formatTime(log.check_in)}
                                                        </span>
                                                    </div>
                                                )}
                                                {log.check_out && (
                                                    <div className="flex items-center gap-0.5 overflow-hidden">
                                                        <LogOut className="w-2 h-2 text-red-600 dark:text-red-400 flex-shrink-0" />
                                                        <span className="text-[8px] font-semibold text-red-700 dark:text-red-300 truncate">
                                                            {formatTime(log.check_out)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Full view for larger screens */}
                                        <div className="hidden sm:flex flex-1 flex-col gap-1 overflow-hidden">
                                            {/* Status Badge */}
                                            <div className="flex items-center justify-center flex-shrink-0">
                                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${getStatusColor(log.status)}`}>
                                                    {log.status === 'present' && 'Present'}
                                                    {log.status === 'absent' && 'Absent'}
                                                    {log.status === 'leave' && 'Leave'}
                                                    {log.status === 'half_day' && 'Half Day'}
                                                </div>
                                            </div>

                                            {/* Check In Time */}
                                            {log.check_in && (
                                                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-1 flex-shrink-0">
                                                    <div className="flex items-center gap-1">
                                                        <LogIn className="w-2 h-2 text-green-600 dark:text-green-400" />
                                                        <span className="text-[9px] font-bold text-green-900 dark:text-green-100">
                                                            {formatTime(log.check_in)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Check Out Time */}
                                            {log.check_out && (
                                                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-1 flex-shrink-0">
                                                    <div className="flex items-center gap-1">
                                                        <LogOut className="w-2 h-2 text-red-600 dark:text-red-400" />
                                                        <span className="text-[9px] font-bold text-red-900 dark:text-red-100">
                                                            {formatTime(log.check_out)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Working Hours */}
                                            {log.check_in && log.check_out && (
                                                <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-md p-1 flex-shrink-0">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Clock className="w-2 h-2 text-purple-600 dark:text-purple-400" />
                                                        <span className="text-[9px] font-bold text-purple-900 dark:text-purple-100">
                                                            {calculateWorkingHours(log.check_in, log.check_out)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Detail Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Details for {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedDate && (
                        <div className="space-y-6">
                            {/* Attendance Details */}
                            {logsMap.get(selectedDate) && (
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Clock className="w-5 h-5" />
                                        Attendance
                                    </h3>
                                    {(() => {
                                        const log = logsMap.get(selectedDate)!
                                        const StatusIcon = getStatusIcon(log.status)
                                        return (
                                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">Status:</span>
                                                    <Badge variant={log.status === 'present' ? 'default' : 'secondary'} className="gap-1">
                                                        <StatusIcon className="w-3 h-3" />
                                                        {log.status === 'present' && 'Present'}
                                                        {log.status === 'absent' && 'Absent'}
                                                        {log.status === 'leave' && 'Leave'}
                                                        {log.status === 'half_day' && 'Half Day'}
                                                    </Badge>
                                                </div>
                                                {log.check_in && (
                                                    <div className="flex items-center gap-2">
                                                        <LogIn className="w-5 h-5 text-green-600" />
                                                        <span className="font-medium">Check In:</span>
                                                        <span className="text-lg font-bold text-green-600">{formatTime(log.check_in)}</span>
                                                    </div>
                                                )}
                                                {log.check_out && (
                                                    <div className="flex items-center gap-2">
                                                        <LogOut className="w-5 h-5 text-red-600" />
                                                        <span className="font-medium">Check Out:</span>
                                                        <span className="text-lg font-bold text-red-600">{formatTime(log.check_out)}</span>
                                                    </div>
                                                )}
                                                {log.check_in && log.check_out && (
                                                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900 p-2 rounded-md">
                                                        <Clock className="w-5 h-5 text-purple-600" />
                                                        <span className="font-medium">Working Hours:</span>
                                                        <span className="text-lg font-bold text-purple-600">{calculateWorkingHours(log.check_in, log.check_out)}</span>
                                                    </div>
                                                )}
                                                {log.notes && (
                                                    <div className="pt-2 border-t">
                                                        <span className="font-medium">Notes:</span>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{log.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}
                                </div>
                            )}

                            {/* Leave Details */}
                            {leavesMap.get(selectedDate) && leavesMap.get(selectedDate)!.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Coffee className="w-5 h-5" />
                                        Leave Requests
                                    </h3>
                                    <div className="space-y-3">
                                        {leavesMap.get(selectedDate)!.map((leave) => (
                                            <div key={leave.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Type:</span>
                                                        <Badge variant="outline">{leave.leave_type}</Badge>
                                                    </div>
                                                    <Badge
                                                        variant={
                                                            leave.request.status === 'approved' ? 'default' :
                                                                leave.request.status === 'pending' ? 'secondary' :
                                                                    'destructive'
                                                        }
                                                    >
                                                        {leave.request.status.charAt(0).toUpperCase() + leave.request.status.slice(1)}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <span className="text-sm text-gray-500">Start Date</span>
                                                        <p className="font-medium">{new Date(leave.start_date).toLocaleDateString()}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-gray-500">End Date</span>
                                                        <p className="font-medium">{new Date(leave.end_date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-sm text-gray-500">Duration</span>
                                                    <p className="font-medium">{leave.total_days} {leave.total_days === 1 ? 'day' : 'days'}</p>
                                                </div>
                                                <div className="pt-2 border-t">
                                                    <span className="font-medium flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        Reason:
                                                    </span>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{leave.reason}</p>
                                                </div>
                                                {leave.request.review_notes && (
                                                    <div className="pt-2 border-t">
                                                        <span className="font-medium">Review Notes:</span>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{leave.request.review_notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Legend */}
            <div className="mt-6 space-y-3">
                <div className="flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Leave</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Half Day</span>
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500">Leave Status:</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-1">
                        <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>
                        <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>
                    </div>
                </div>
            </div>
        </div>
    )
}
