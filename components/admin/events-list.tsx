'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { CalendarEventWithDetails, Calendar } from '@/lib/types/calendar';
import { format } from 'date-fns';

interface EventsListProps {
  events: CalendarEventWithDetails[];
  calendars: Calendar[];
  onCreateEvent: () => void;
  onEditEvent: (event: CalendarEventWithDetails) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function EventsList({
  events,
  calendars,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
}: EventsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCalendar, setSelectedCalendar] = useState<string>('all');
  const [selectedCreator, setSelectedCreator] = useState<string>('all');

  // Get unique creators from events
  const creators = Array.from(
    new Set(
      events
        .filter((e) => e.creator)
        .map((e) => JSON.stringify({ id: e.creator!.id, name: e.creator!.full_name }))
    )
  ).map((str) => JSON.parse(str));

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchQuery === '' ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCalendar =
      selectedCalendar === 'all' || event.calendar_id === selectedCalendar;

    const matchesCreator =
      selectedCreator === 'all' || event.created_by === selectedCreator;

    return matchesSearch && matchesCalendar && matchesCreator;
  });

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold">All Events</h2>
          <Badge variant="secondary">{filteredEvents.length}</Badge>
        </div>
        <Button onClick={onCreateEvent}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Calendars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Calendars</SelectItem>
            {calendars.map((cal) => (
              <SelectItem key={cal.id} value={cal.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cal.color }}
                  />
                  {cal.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCreator} onValueChange={setSelectedCreator}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {creators.map((creator) => (
              <SelectItem key={creator.id} value={creator.id}>
                {creator.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Events Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Calendar</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Attendees</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{event.title}</div>
                      {event.description && (
                        <div className="text-sm text-gray-500 truncate max-w-[300px]">
                          {event.description}
                        </div>
                      )}
                      {event.location && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          📍 {event.location}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.creator ? (
                      <div className="flex items-center gap-2">
                        {event.creator.avatar_url ? (
                          <Image
                            src={event.creator.avatar_url}
                            alt={event.creator.full_name}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                            {event.creator.full_name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm">{event.creator.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {event.calendar && (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: event.calendar.color }}
                        />
                        <span className="text-sm">{event.calendar.name}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(new Date(event.start_time), 'MMM d, yyyy')}</div>
                      <div className="text-gray-500">
                        {event.is_all_day
                          ? 'All day'
                          : `${format(new Date(event.start_time), 'HH:mm')} - ${format(
                            new Date(event.end_time),
                            'HH:mm'
                          )}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.attendees && event.attendees.length > 0 ? (
                      <Badge variant="outline">{event.attendees.length} attendees</Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditEvent(event)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteEvent(event.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
