'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalendarEventWithDetails } from '@/lib/types/calendar';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarViewProps {
  events: CalendarEventWithDetails[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithDetails) => void;
  onCreateEvent: () => void;
}

export function CalendarView({
  events,
  currentDate,
  onDateChange,
  onDateClick,
  onEventClick,
  onCreateEvent,
}: CalendarViewProps) {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Generate calendar days based on view
  const calendarDays = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      // day view - just return single day
      return [currentDate];
    }
  }, [currentDate, view]);

  // Group events by date - for multi-day events, add to all dates in range
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventWithDetails[]>();

    events.forEach(event => {
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);

      // For multi-day events (especially holidays), add to all dates in the range
      if (event.is_all_day || event.event_type === 'holiday') {
        // Generate all dates in the range
        const currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);
        const finalDate = new Date(endDate);
        finalDate.setHours(0, 0, 0, 0);

        while (currentDate <= finalDate) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey)!.push(event);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // For single-day events, just add to start date
        const dateKey = format(startDate, 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(event);
      }
    });

    return map;
  }, [events]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  }, [selectedDate, eventsByDate]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick(date);
  };

  const previousMonth = () => onDateChange(subMonths(currentDate, 1));
  const nextMonth = () => onDateChange(addMonths(currentDate, 1));
  const goToToday = () => onDateChange(new Date());

  return (
    <div className="flex h-full gap-4">
      {/* Calendar Section */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-lg border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-1">
              {(['month', 'week', 'day'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1 text-sm rounded capitalize transition-colors',
                    view === v
                      ? 'bg-white dark:bg-gray-700 shadow-sm'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            <Button onClick={onCreateEvent}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-4 overflow-auto">
          {/* Weekday Headers - only show for month and week views */}
          {view !== 'day' && (
            <div className="grid grid-cols-7 gap-px mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>
          )}

          {/* Days Grid */}
          <div className={cn(
            'gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden',
            view === 'day' ? 'grid grid-cols-1' : 'grid grid-cols-7'
          )}>
            {calendarDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              // Check if this day has a holiday or poya event
              const holidayEvent = dayEvents.find(event => event.event_type === 'holiday');
              const poyaEvent = dayEvents.find(event => event.event_type === 'poya');
              const isHoliday = !!holidayEvent;
              const isPoya = !!poyaEvent;
              const isSpecialDay = isHoliday || isPoya;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    // Only prevent clicking on holidays (Poya days are allowed)
                    if (!isHoliday) {
                      handleDateClick(day);
                    }
                  }}
                  className={cn(
                    'min-h-24 p-2 transition-colors relative',
                    // Holiday styling - gray background
                    isHoliday
                      ? 'bg-gray-100 dark:bg-gray-800/50 border-2 border-gray-300 dark:border-gray-700 cursor-not-allowed'
                      : '',
                    // Poya styling - yellow background (but still clickable)
                    isPoya && !isHoliday
                      ? 'bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-800 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
                      : '',
                    // Regular day styling
                    !isHoliday && !isPoya
                      ? 'bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                      : '',
                    !isCurrentMonth && 'opacity-40',
                    isSelected && !isHoliday && 'ring-2 ring-blue-500 ring-inset'
                  )}
                  title={
                    isHoliday
                      ? `Holiday: ${holidayEvent.title}`
                      : isPoya
                        ? `Poya Day: ${poyaEvent.title}`
                        : undefined
                  }
                >
                  {/* Holiday indicator badge */}
                  {isHoliday && (
                    <div className="absolute top-1 right-1 bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      HOLIDAY
                    </div>
                  )}

                  {/* Poya indicator badge */}
                  {isPoya && (
                    <div className="absolute top-1 right-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      POYA
                    </div>
                  )}

                  <div
                    className={cn(
                      'text-sm font-medium mb-1',
                      isToday &&
                      'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center',
                      isHoliday && !isToday && 'text-gray-700 dark:text-gray-400 font-bold',
                      isPoya && !isToday && 'text-yellow-700 dark:text-yellow-400 font-bold'
                    )}
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Holiday Title */}
                  {isHoliday && (
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-400 mb-2 truncate">
                      🎉 {holidayEvent.title}
                    </div>
                  )}

                  {/* Poya Title */}
                  {isPoya && (
                    <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2 truncate">
                      🌙 {poyaEvent.title}
                    </div>
                  )}

                  {/* Other Events (non-holiday/non-poya) */}
                  <div className="space-y-1">
                    {dayEvents
                      .filter(event => event.event_type !== 'holiday' && event.event_type !== 'poya')
                      .slice(0, isHoliday ? 2 : 3)
                      .map(event => (
                        <div
                          key={event.id}
                          onClick={e => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          className={cn(
                            'text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity',
                            'text-white'
                          )}
                          style={{
                            backgroundColor: event.calendar?.color || '#3B82F6',
                          }}
                          title={event.title}
                        >
                          {!event.is_all_day && format(new Date(event.start_time), 'h:mm a')} {event.title}
                        </div>
                      ))}
                    {dayEvents.filter(e => e.event_type !== 'holiday' && e.event_type !== 'poya').length > (isHoliday ? 2 : 3) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                        +{dayEvents.filter(e => e.event_type !== 'holiday' && e.event_type !== 'poya').length - (isHoliday ? 2 : 3)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Events Sidebar */}
      {/* <div className="w-80 bg-white dark:bg-gray-900 rounded-lg border p-4 flex flex-col">
        {selectedDate ? (
          <>
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'event' : 'events'}
              </p>
            </div>

            <div className="flex-1 overflow-auto space-y-3">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map(event => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-full rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: event.calendar?.color || '#3B82F6',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {event.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                        </p>
                        {event.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        {event.calendar && (
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: event.calendar.color || '#3B82F6',
                              }}
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {event.calendar.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                    No Events
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    There are no events scheduled for this date.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <CalendarIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              Select a Date
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click on a date to view its events
            </p>
          </div>
        )}
      </div> */}
    </div>
  );
}
