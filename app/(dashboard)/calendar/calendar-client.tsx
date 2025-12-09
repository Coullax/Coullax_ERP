"use client";

import { useEffect, useState } from "react";
import { CalendarView } from "@/components/calendar-view";
import { EventDialog } from "@/components/event-dialog";
import { IntegrationSettings } from "@/components/integration-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Calendar } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [calendarsData, integrationsData, subscriptionsData] =
        await Promise.all([
          getUserCalendars(),
          getCalendarIntegrations(),
          getAppleSubscriptions(),
        ]);

      setCalendars(calendarsData);
      setIntegrations(integrationsData);
      setSubscriptions(subscriptionsData);

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
    <div className="h-full p-6">
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
        </TabsList>

        <TabsContent value="calendar" className="h-[calc(100%-60px)]">
          <CalendarView
            events={events}
            onDateClick={(date) => {
              setSelectedDate(date);
            }}
            onEventClick={(event) => {
              // Handle event click - could open event details dialog
              console.log("Event clicked:", event);
            }}
            onCreateEvent={() => {
              setSelectedDate(undefined);
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
      </Tabs>

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        calendars={calendars}
        defaultDate={selectedDate}
        onSave={handleCreateEvent}
      />
    </div>
  );
}
