'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getGoogleAuthUrl } from '@/lib/integrations/google-calendar';
import { createCalendarSubscription, getUserSubscriptions } from '@/lib/integrations/calendar-feed';
import type { CreateEventInput, UpdateEventInput } from '@/lib/types/calendar';

/**
 * Get all calendars accessible to the current user
 * - Admins/Super Admins: See ALL calendars (from all employees)
 * - Regular Users: See only their own calendars + shared/department calendars
 * Access is controlled by RLS policies in the database
 */
export async function getUserCalendars() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // RLS policies automatically filter based on user role
  // Admins will see all calendars, regular users see only accessible ones
  const { data, error } = await supabase
    .from('calendars')
    .select(`
      *,
      owner:profiles!calendars_owner_id_fkey(id, full_name, email, avatar_url),
      department:departments(id, name)
    `)
    .order('is_default', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new calendar
 */
export async function createCalendar(name: string, description?: string, type: 'personal' | 'shared' | 'department' = 'personal', departmentId?: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const calendarData: any = {
    name,
    description,
    type,
    is_active: true,
  };

  if (type === 'personal') {
    calendarData.owner_id = user.id;
  } else if (type === 'department' || type === 'shared') {
    calendarData.department_id = departmentId;
  }

  const { data, error } = await supabase
    .from('calendars')
    .insert(calendarData)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/calendar');
  return data;
}

/**
 * Get events for a date range
 * - Admins/Super Admins: See ALL events (from all employees)  
 * - Regular Users: See only events in accessible calendars
 * @param calendarIds Optional filter by specific calendar IDs
 */
export async function getCalendarEvents(startDate: string, endDate: string, calendarIds?: string[]) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // RLS policies automatically filter events based on user role and calendar access
  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      calendar:calendars(id, name, type, color),
      creator:profiles!calendar_events_created_by_fkey(id, full_name, email, avatar_url),
      attendees:event_attendees(
        *,
        user:profiles(id, full_name, email, avatar_url)
      ),
      reminders:event_reminders(*)
    `)
    .gte('end_time', startDate)
    .lte('start_time', endDate)
    .order('start_time', { ascending: true });

  if (calendarIds && calendarIds.length > 0) {
    query = query.in('calendar_id', calendarIds);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Create a new event
 */
export async function createEvent(input: CreateEventInput) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const eventData = {
    calendar_id: input.calendar_id,
    created_by: user.id,
    title: input.title,
    description: input.description,
    location: input.location,
    start_time: input.start_time,
    end_time: input.end_time,
    is_all_day: input.is_all_day || false,
    timezone: input.timezone || 'UTC',
    visibility: input.visibility || 'internal',
    status: 'confirmed',
  };

  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert(eventData)
    .select()
    .single();

  if (error) throw error;

  // Add attendees if provided
  if (input.attendee_emails && input.attendee_emails.length > 0) {
    const attendees = input.attendee_emails.map(email => ({
      event_id: event.id,
      email,
      response_status: 'pending',
    }));

    await supabase.from('event_attendees').insert(attendees);
  }

  // Add reminders if provided
  if (input.reminder_minutes && input.reminder_minutes.length > 0) {
    const reminders = input.reminder_minutes.map(minutes => ({
      event_id: event.id,
      user_id: user.id,
      minutes_before: minutes,
      method: 'notification',
    }));

    await supabase.from('event_reminders').insert(reminders);
  }

  // Check if calendar has Google integration and sync
  const { data: integration } = await supabase
    .from('calendar_integrations')
    .select('id')
    .eq('calendar_id', input.calendar_id)
    .eq('provider', 'google')
    .eq('sync_enabled', true)
    .single();

  if (integration) {
    // Trigger background sync (we'll implement this later)
    // For now, just log it
    console.log('Would sync event to Google Calendar:', event.id);
  }

  revalidatePath('/calendar');
  return event;
}

/**
 * Update an existing event
 */
export async function updateEvent(input: UpdateEventInput) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/calendar');
  return data;
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;

  revalidatePath('/calendar');
  return { success: true };
}

/**
 * Initiate Google Calendar connection
 */
export async function connectGoogleCalendar(calendarId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { url } = await getGoogleAuthUrl(user.id, calendarId);
  return { url };
}

/**
 * Disconnect Google Calendar integration
 */
export async function disconnectGoogleCalendar(integrationId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('calendar_integrations')
    .delete()
    .eq('id', integrationId)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/calendar');
  return { success: true };
}

/**
 * Get calendar integrations
 */
export async function getCalendarIntegrations() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('calendar_integrations')
    .select(`
      *,
      calendar:calendars(id, name, type, color)
    `)
    .eq('user_id', user.id);

  if (error) throw error;
  return data || [];
}

/**
 * Create Apple Calendar subscription
 */
export async function createAppleSubscription(calendarId: string, includePrivate: boolean = false) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const subscription = await createCalendarSubscription(calendarId, user.id, includePrivate);

  revalidatePath('/calendar');
  return subscription;
}

/**
 * Get user's Apple Calendar subscriptions
 */
export async function getAppleSubscriptions() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const subscriptions = await getUserSubscriptions(user.id);
  return subscriptions || [];
}

/**
 * Share calendar with another user
 */
export async function shareCalendar(
  calendarId: string,
  userEmail: string,
  permissions: { canView: boolean; canEdit: boolean; canDelete: boolean }
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find user by email
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', userEmail)
    .single();

  if (!targetUser) {
    throw new Error('User not found');
  }

  const { data, error } = await supabase
    .from('calendar_shares')
    .insert({
      calendar_id: calendarId,
      shared_with_user_id: targetUser.id,
      shared_by_user_id: user.id,
      can_view: permissions.canView,
      can_edit: permissions.canEdit,
      can_delete: permissions.canDelete,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/calendar');
  return data;
}
