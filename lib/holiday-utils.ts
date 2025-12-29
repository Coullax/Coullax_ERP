/**
 * Holiday Utilities
 * Functions to check and manage holidays in the calendar system
 */

import { createClient } from '@/lib/supabase/client'
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export interface Holiday {
    id: string
    title: string
    start_time: string
    end_time: string
    description?: string
}

/**
 * Check if a specific date is a holiday
 */
export async function isHoliday(date: Date): Promise<boolean> {
    const supabase = createClient()
    const dateStr = format(date, 'yyyy-MM-dd')

    const { data, error } = await supabase.rpc('is_holiday', {
        check_date: dateStr
    })

    if (error) {
        console.error('Error checking holiday:', error)
        return false
    }

    return data === true
}

/**
 * Get all holidays within a date range
 */
export async function getHolidays(startDate: Date, endDate: Date): Promise<Holiday[]> {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_holidays', {
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd')
    })

    if (error) {
        console.error('Error fetching holidays:', error)
        return []
    }

    return data || []
}

/**
 * Get holiday name for a specific date (if it exists)
 */
export async function getHolidayName(date: Date): Promise<string | null> {
    const supabase = createClient()
    const dateStr = format(date, 'yyyy-MM-dd')

    const { data, error } = await supabase
        .from('calendar_events')
        .select('title')
        .eq('event_type', 'holiday')
        .lte('start_time', endOfDay(date).toISOString())
        .gte('end_time', startOfDay(date).toISOString())
        .neq('status', 'cancelled')
        .single()

    if (error || !data) {
        return null
    }

    return data.title
}

/**
 * Check if any date in an array is a holiday
 */
export async function hasHolidayInRange(dates: Date[]): Promise<boolean> {
    if (dates.length === 0) return false

    const supabase = createClient()
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())))

    const holidays = await getHolidays(startDate, endDate)

    return dates.some(date => {
        return holidays.some(holiday => {
            const holidayStart = startOfDay(parseISO(holiday.start_time))
            const holidayEnd = endOfDay(parseISO(holiday.end_time))
            return isWithinInterval(date, { start: holidayStart, end: holidayEnd })
        })
    })
}

/**
 * Get list of holiday dates in a range
 */
export async function getHolidayDates(startDate: Date, endDate: Date): Promise<Date[]> {
    const holidays = await getHolidays(startDate, endDate)
    const holidayDates: Date[] = []

    holidays.forEach(holiday => {
        const start = startOfDay(parseISO(holiday.start_time))
        const end = endOfDay(parseISO(holiday.end_time))

        let currentDate = new Date(start)
        while (currentDate <= end) {
            holidayDates.push(new Date(currentDate))
            currentDate.setDate(currentDate.getDate() + 1)
        }
    })

    return holidayDates
}

/**
 * Filter out holidays from a list of dates
 */
export async function filterOutHolidays(dates: Date[]): Promise<Date[]> {
    if (dates.length === 0) return []

    const startDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())))

    const holidayDates = await getHolidayDates(startDate, endDate)
    const holidayDateStrings = new Set(holidayDates.map(d => format(d, 'yyyy-MM-dd')))

    return dates.filter(date => !holidayDateStrings.has(format(date, 'yyyy-MM-dd')))
}
