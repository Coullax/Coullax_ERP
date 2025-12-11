'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

interface AttendanceCalendarProps {
    logs: AttendanceLog[]
}

export function AttendanceCalendar({ logs }: AttendanceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    // Convert logs array to a map for quick lookup
    const logsMap = new Map(logs.map((log) => [log.date, log]))

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
                    const isToday =
                        day === new Date().getDate() &&
                        month === new Date().getMonth() &&
                        year === new Date().getFullYear()

                    return (
                        <div
                            key={day}
                            className={`
                min-h-[80px] sm:aspect-square p-1 sm:p-2 rounded-lg border-2 transition-all overflow-hidden
                ${isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-800'}
                ${log ? 'hover:shadow-lg cursor-pointer' : ''}
              `}
                        >
                            <div className="h-full flex flex-col overflow-hidden">
                                {/* Day Number */}
                                <div className={`text-xs sm:text-sm font-semibold mb-1 flex-shrink-0 ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                                    {day}
                                </div>

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
                                        <div className="hidden sm:flex flex-1 flex-col gap-2 overflow-hidden">
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
                                                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-1.5 flex-shrink-0">
                                                    <div className="flex items-center gap-1 mb-0.5">
                                                        <LogIn className="w-3 h-3 text-green-600 dark:text-green-400" />
                                                        <span className="text-[10px] font-semibold text-green-700 dark:text-green-300">In</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-green-900 dark:text-green-100 pl-4">
                                                        {formatTime(log.check_in)}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Check Out Time */}
                                            {log.check_out && (
                                                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-1.5 flex-shrink-0">
                                                    <div className="flex items-center gap-1 mb-0.5">
                                                        <LogOut className="w-3 h-3 text-red-600 dark:text-red-400" />
                                                        <span className="text-[10px] font-semibold text-red-700 dark:text-red-300">Out</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-red-900 dark:text-red-100 pl-4">
                                                        {formatTime(log.check_out)}
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

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
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
        </div>
    )
}
