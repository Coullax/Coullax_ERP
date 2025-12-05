import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

/**
 * Get OAuth2 client for Google Calendar API
 */
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
  );
}

/**
 * Generate Google OAuth authorization URL
 */
export async function getGoogleAuthUrl(userId: string, calendarId: string) {
  const oauth2Client = getOAuth2Client();
  
  // State parameter includes user and calendar info for callback
  const state = Buffer.from(
    JSON.stringify({ userId, calendarId })
  ).toString('base64');

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent screen to get refresh token
  });

  return { url, state };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Store Google Calendar integration in database
 */
export async function storeGoogleIntegration(
  userId: string,
  calendarId: string,
  tokens: any,
  externalCalendarId: string = 'primary'
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('calendar_integrations')
    .insert({
      user_id: userId,
      calendar_id: calendarId,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date 
        ? new Date(tokens.expiry_date).toISOString() 
        : null,
      external_calendar_id: externalCalendarId,
      sync_enabled: true,
      sync_direction: 'two_way',
      next_sync_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Sync in 5 min
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get OAuth2 client with stored tokens
 */
async function getAuthenticatedClient(integrationId: string) {
  const supabase = await createClient();
  
  const { data: integration, error } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('id', integrationId)
    .single();

  if (error || !integration) {
    throw new Error('Integration not found');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: integration.token_expires_at 
      ? new Date(integration.token_expires_at).getTime() 
      : undefined,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await supabase
        .from('calendar_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expiry_date 
            ? new Date(tokens.expiry_date).toISOString() 
            : null,
        })
        .eq('id', integrationId);
    }
  });

  return { oauth2Client, integration };
}

/**
 * Sync events from Google Calendar to our database
 */
export async function syncFromGoogle(integrationId: string) {
  const supabase = await createClient();
  const { oauth2Client, integration } = await getAuthenticatedClient(integrationId);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Create sync log
  const { data: syncLog } = await supabase
    .from('calendar_sync_logs')
    .insert({
      integration_id: integrationId,
      sync_status: 'in_progress',
      direction: 'from_external',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  try {
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsSynced = 0;

    // Use sync token for incremental sync if available
    const params: any = {
      calendarId: integration.external_calendar_id || 'primary',
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (integration.sync_token) {
      params.syncToken = integration.sync_token;
    } else {
      // First sync - get events from last 30 days forward
      params.timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const response = await calendar.events.list(params);
    const events = response.data.items || [];

    for (const googleEvent of events) {
      eventsSynced++;

      // Check if event already exists
      const { data: existingEvent } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('google_event_id', googleEvent.id)
        .single();

      const eventData = {
        calendar_id: integration.calendar_id,
        title: googleEvent.summary || 'Untitled Event',
        description: googleEvent.description,
        location: googleEvent.location,
        start_time: googleEvent.start?.dateTime || googleEvent.start?.date,
        end_time: googleEvent.end?.dateTime || googleEvent.end?.date,
        is_all_day: !googleEvent.start?.dateTime,
        status: googleEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
        google_event_id: googleEvent.id,
        external_event_url: googleEvent.htmlLink,
      };

      if (existingEvent) {
        // Update existing event
        await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', existingEvent.id);
        eventsUpdated++;
      } else {
        // Create new event
        await supabase
          .from('calendar_events')
          .insert(eventData);
        eventsCreated++;
      }
    }

    // Update sync token for next incremental sync
    const newSyncToken = response.data.nextSyncToken;
    await supabase
      .from('calendar_integrations')
      .update({
        sync_token: newSyncToken,
        last_sync_at: new Date().toISOString(),
        next_sync_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Next sync in 15 min
      })
      .eq('id', integrationId);

    // Update sync log
    await supabase
      .from('calendar_sync_logs')
      .update({
        sync_status: 'success',
        events_synced: eventsSynced,
        events_created: eventsCreated,
        events_updated: eventsUpdated,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.floor(
          (new Date().getTime() - new Date(syncLog!.started_at).getTime()) / 1000
        ),
      })
      .eq('id', syncLog!.id);

    return {
      success: true,
      eventsSynced,
      eventsCreated,
      eventsUpdated,
    };
  } catch (error: any) {
    // Log error
    await supabase
      .from('calendar_sync_logs')
      .update({
        sync_status: 'failed',
        error_message: error.message,
        error_details: { error: error.toString() },
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLog!.id);

    throw error;
  }
}

/**
 * Push event to Google Calendar
 */
export async function pushEventToGoogle(eventId: string, integrationId: string) {
  const supabase = await createClient();
  const { oauth2Client, integration } = await getAuthenticatedClient(integrationId);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get event from database
  const { data: event, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    throw new Error('Event not found');
  }

  const googleEvent: any = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.is_all_day
      ? { date: event.start_time.split('T')[0] }
      : { dateTime: event.start_time, timeZone: event.timezone || 'UTC' },
    end: event.is_all_day
      ? { date: event.end_time.split('T')[0] }
      : { dateTime: event.end_time, timeZone: event.timezone || 'UTC' },
    status: event.status,
  };

  try {
    let googleEventId = event.google_event_id;

    if (googleEventId) {
      // Update existing Google Calendar event
      await calendar.events.update({
        calendarId: integration.external_calendar_id || 'primary',
        eventId: googleEventId,
        requestBody: googleEvent,
      });
    } else {
      // Create new Google Calendar event
      const response = await calendar.events.insert({
        calendarId: integration.external_calendar_id || 'primary',
        requestBody: googleEvent,
      });

      googleEventId = response.data.id!;

      // Store Google event ID in our database
      await supabase
        .from('calendar_events')
        .update({ 
          google_event_id: googleEventId,
          external_event_url: response.data.htmlLink,
        })
        .eq('id', eventId);
    }

    return { success: true, googleEventId };
  } catch (error: any) {
    console.error('Error pushing event to Google Calendar:', error);
    throw error;
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteEventFromGoogle(googleEventId: string, integrationId: string) {
  const { oauth2Client, integration } = await getAuthenticatedClient(integrationId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    await calendar.events.delete({
      calendarId: integration.external_calendar_id || 'primary',
      eventId: googleEventId,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting event from Google Calendar:', error);
    throw error;
  }
}

/**
 * List user's Google Calendars
 */
export async function listGoogleCalendars(integrationId: string) {
  const { oauth2Client } = await getAuthenticatedClient(integrationId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.calendarList.list();
  return response.data.items || [];
}
