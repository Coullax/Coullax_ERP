import { createClient } from '@/lib/supabase/server';
import { createEvents, EventAttributes } from 'ics';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Generate a secure subscription token
 */
export function generateSubscriptionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create or get subscription for a calendar
 */
export async function createCalendarSubscription(
  calendarId: string,
  userId: string,
  includePrivateEvents: boolean = false
) {
  const supabase = await createClient();

  // Check if subscription already exists
  const { data: existing } = await supabase
    .from('calendar_subscriptions')
    .select('*')
    .eq('calendar_id', calendarId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing;
  }

  // Create new subscription
  const token = generateSubscriptionToken();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const feedUrl = `webcal://${appUrl.replace(/^https?:\/\//, '')}/api/calendar/feed/${token}`;

  const { data, error } = await supabase
    .from('calendar_subscriptions')
    .insert({
      calendar_id: calendarId,
      user_id: userId,
      subscription_token: token,
      feed_url: feedUrl,
      include_private_events: includePrivateEvents,
      is_active: true,
      access_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Generate iCalendar feed for a subscription
 */
export async function generateCalendarFeed(subscriptionToken: string): Promise<string> {
  const supabase = await createClient();

  // Get subscription
  const { data: subscription, error: subError } = await supabase
    .from('calendar_subscriptions')
    .select(`
      *,
      calendar:calendars(*)
    `)
    .eq('subscription_token', subscriptionToken)
    .eq('is_active', true)
    .single();

  if (subError || !subscription) {
    throw new Error('Invalid subscription token');
  }

  // Update access stats
  await supabase
    .from('calendar_subscriptions')
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (subscription.access_count || 0) + 1,
    })
    .eq('id', subscription.id);

  // Get events from calendar
  const { data: events, error: eventsError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('calendar_id', subscription.calendar_id)
    .gte('end_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days to future
    .order('start_time', { ascending: true });

  if (eventsError) throw eventsError;

  // Filter private events if needed
  const filteredEvents = subscription.include_private_events
    ? events
    : events?.filter(e => e.visibility !== 'private');

  // Convert to iCalendar format
  const icsEvents: EventAttributes[] = (filteredEvents || []).map(event => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);

    const icsEvent: EventAttributes = {
      uid: event.id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      start: event.is_all_day
        ? [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()]
        : [
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            startDate.getDate(),
            startDate.getHours(),
            startDate.getMinutes(),
          ],
      end: event.is_all_day
        ? [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()]
        : [
            endDate.getFullYear(),
            endDate.getMonth() + 1,
            endDate.getDate(),
            endDate.getHours(),
            endDate.getMinutes(),
          ],
      status: event.status.toUpperCase() as any,
      created: (() => {
        const d = new Date(event.created_at);
        return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
      })(),
      lastModified: (() => {
        const d = new Date(event.updated_at);
        return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
      })(),
    };

    if (event.is_recurring && event.recurrence_rule) {
      icsEvent.recurrenceRule = event.recurrence_rule;
    }

    if (event.external_event_url) {
      icsEvent.url = event.external_event_url;
    }

    return icsEvent;
  });

  // Generate iCalendar content
  const { error: icsError, value: icsContent } = createEvents(icsEvents);

  if (icsError) {
    console.error('Error creating ICS:', icsError);
    throw new Error('Failed to generate calendar feed');
  }

  return icsContent || '';
}

/**
 * Revoke/regenerate subscription token
 */
export async function regenerateSubscriptionToken(subscriptionId: string) {
  const supabase = await createClient();

  const newToken = generateSubscriptionToken();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const newFeedUrl = `webcal://${appUrl.replace(/^https?:\/\//, '')}/api/calendar/feed/${newToken}`;

  const { data, error } = await supabase
    .from('calendar_subscriptions')
    .update({
      subscription_token: newToken,
      feed_url: newFeedUrl,
      access_count: 0,
      last_accessed_at: null,
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deactivate a subscription
 */
export async function deactivateSubscription(subscriptionId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('calendar_subscriptions')
    .update({ is_active: false })
    .eq('id', subscriptionId);

  if (error) throw error;
  return { success: true };
}

/**
 * Get all subscriptions for a user
 */
export async function getUserSubscriptions(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('calendar_subscriptions')
    .select(`
      *,
      calendar:calendars(id, name, type, color)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
