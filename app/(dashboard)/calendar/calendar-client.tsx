"use client";

import { useEffect, useState } from "react";
import { CalendarView } from "@/components/calendar-view";
import { EventDialog } from "@/components/event-dialog";
import { IntegrationSettings } from "@/components/integration-settings";
import { EventsList } from "@/components/admin/events-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, Calendar, List, MapPin, Clock, Users, Bell, Repeat } from "lucide-react";
import type {
  CalendarEventWithDetails,
  Calendar as CalendarType,
  CalendarIntegration,
  CalendarSubscription,
} from "@/lib/types/calendar";
import {
  getUserCalendars,
  getCalendarEvents,
  createEvent,
  getCalendarIntegrations,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  createAppleSubscription,
  getAppleSubscriptions,
  isAdmin,
  deleteEvent,
} from "./actions";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function CalendarClient() {
  const [calendars, setCalendars] = useState<CalendarType[]>([]);
  const [events, setEvents] = useState<CalendarEventWithDetails[]>([]);
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithDetails | undefined>();
  const [viewingEvent, setViewingEvent] = useState<CalendarEventWithDetails | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [calendarsData, integrationsData, subscriptionsData, adminStatus] =
        await Promise.all([
          getUserCalendars(),
          getCalendarIntegrations(),
          getAppleSubscriptions(),
          isAdmin(),
        ]);

      setCalendars(calendarsData);
      setIntegrations(integrationsData);
      setSubscriptions(subscriptionsData);
      setIsUserAdmin(adminStatus);
      
      // Debug logging
      console.log('Admin status check:', adminStatus);
      console.log('Is user admin:', adminStatus);

      // Load events for current month
      const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

      try {
        const eventsData = await getCalendarEvents(startDate, endDate);
        setEvents(eventsData);
      } catch (eventError) {
        console.error("Error loading events:", eventError);
        setEvents([]);
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      await createEvent(eventData);
      toast.success("Event created successfully");
      await loadData(); // Reload data
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
      throw error;
    }
  };

  const handleConnectGoogle = async (calendarId: string) => {
    try {
      const { url } = await connectGoogleCalendar(calendarId);
      window.location.href = url;
    } catch (error) {
      console.error("Error connecting Google Calendar:", error);
      toast.error("Failed to connect Google Calendar");
    }
  };

  const handleDisconnectGoogle = async (integrationId: string) => {
    try {
      await disconnectGoogleCalendar(integrationId);
      toast.success("Disconnected from Google Calendar");
      await loadData();
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect");
    }
  };

  const handleCreateSubscription = async (calendarId: string) => {
    try {
      await createAppleSubscription(calendarId);
      toast.success("Subscription created successfully");
      await loadData();
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast.error("Failed to create subscription");
    }
  };

  const handleSyncNow = async (integrationId: string) => {
    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId }),
      });

      if (!response.ok) throw new Error("Sync failed");

      await loadData();
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      toast.success("Event deleted successfully");
      await loadData(); // Reload data
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleEditEvent = (event: CalendarEventWithDetails) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-gray-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-500">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Tabs defaultValue="calendar" className="h-full">
        <TabsList className="mb-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          {isUserAdmin && (
            <TabsTrigger value="events" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Events
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="calendar" className="h-[calc(100%-60px)]">
          <CalendarView
            events={events}
            onDateClick={(date) => {
              setSelectedDate(date);
            }}
            onEventClick={(event) => {
              setViewingEvent(event);
              setEventDetailsOpen(true);
            }}
            onCreateEvent={() => {
              setSelectedDate(undefined);
              setSelectedEvent(undefined);
              setEventDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationSettings
            integrations={integrations}
            subscriptions={subscriptions}
            calendars={calendars}
            onConnectGoogle={handleConnectGoogle}
            onDisconnectGoogle={handleDisconnectGoogle}
            onCreateSubscription={handleCreateSubscription}
            onSyncNow={handleSyncNow}
          />
        </TabsContent>

        {isUserAdmin && (
          <TabsContent value="events">
            <EventsList
              events={events}
              calendars={calendars}
              onCreateEvent={() => {
                setSelectedDate(undefined);
                setSelectedEvent(undefined);
                setEventDialogOpen(true);
              }}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </TabsContent>
        )}
      </Tabs>

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        calendars={calendars}
        defaultDate={selectedDate}
        onSave={handleCreateEvent}
      />

      {/* Event Details Dialog */}
      <Dialog open={eventDetailsOpen} onOpenChange={setEventDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {viewingEvent.title}
                </DialogTitle>
                {viewingEvent.description && (
                  <DialogDescription className="text-base mt-2">
                    {viewingEvent.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Status and Visibility Badges */}
                <div className="flex gap-2">
                  <Badge variant={viewingEvent.status === 'confirmed' ? 'default' : viewingEvent.status === 'tentative' ? 'secondary' : 'destructive'}>
                    {viewingEvent.status}
                  </Badge>
                  <Badge variant="outline">
                    {viewingEvent.visibility}
                  </Badge>
                  {viewingEvent.is_all_day && (
                    <Badge variant="outline">All Day</Badge>
                  )}
                </div>

                <Separator />

                {/* Time Information */}
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-500">Time</p>
                    <p className="text-sm">
                      {new Date(viewingEvent.start_time).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: viewingEvent.is_all_day ? undefined : '2-digit',
                        minute: viewingEvent.is_all_day ? undefined : '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      to {new Date(viewingEvent.end_time).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: viewingEvent.is_all_day ? undefined : '2-digit',
                        minute: viewingEvent.is_all_day ? undefined : '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Timezone: {viewingEvent.timezone}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {viewingEvent.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-500">Location</p>
                      <p className="text-sm">{viewingEvent.location}</p>
                    </div>
                  </div>
                )}

                {/* Calendar */}
                {viewingEvent.calendar && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-500">Calendar</p>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: viewingEvent.calendar.color }}
                        />
                        <p className="text-sm">{viewingEvent.calendar.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Creator */}
                {viewingEvent.creator && (
                  <div className="flex items-start gap-3">
                    <Avatar className="w-5 h-5 mt-0.5">
                      <AvatarImage src={viewingEvent.creator.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {viewingEvent.creator.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-500">Created By</p>
                      <p className="text-sm">{viewingEvent.creator.full_name}</p>
                      <p className="text-xs text-gray-500">{viewingEvent.creator.email}</p>
                    </div>
                  </div>
                )}

                {/* Attendees */}
                {viewingEvent.attendees && viewingEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-500 mb-2">Attendees ({viewingEvent.attendees.length})</p>
                      <div className="space-y-2">
                        {viewingEvent.attendees.map((attendee) => (
                          <div key={attendee.id} className="flex items-center justify-between text-sm">
                            <span>{attendee.email}</span>
                            <Badge 
                              variant={attendee.response_status === 'accepted' ? 'default' : 
                                      attendee.response_status === 'declined' ? 'destructive' : 
                                      'secondary'}
                              className="text-xs"
                            >
                              {attendee.response_status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reminders */}
                {viewingEvent.reminders && viewingEvent.reminders.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-500 mb-2">Reminders</p>
                      <div className="space-y-1">
                        {viewingEvent.reminders.map((reminder) => (
                          <div key={reminder.id} className="text-sm flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {reminder.method}
                            </Badge>
                            <span>{reminder.minutes_before} minutes before</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recurrence */}
                {viewingEvent.is_recurring && (
                  <div className="flex items-start gap-3">
                    <Repeat className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-500">Recurrence</p>
                      {viewingEvent.recurrence_rule && (
                        <p className="text-sm">{viewingEvent.recurrence_rule}</p>
                      )}
                      {viewingEvent.recurrence_end_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Until {new Date(viewingEvent.recurrence_end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <Separator />
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Created: {new Date(viewingEvent.created_at).toLocaleString()}</p>
                  <p>Last updated: {new Date(viewingEvent.updated_at).toLocaleString()}</p>
                  {viewingEvent.google_event_id && (
                    <p>Google Event ID: {viewingEvent.google_event_id}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
