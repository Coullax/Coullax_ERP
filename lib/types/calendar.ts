// Calendar-specific types and interfaces

export type CalendarType = 'personal' | 'shared' | 'department';
export type EventVisibility = 'public' | 'private' | 'internal';
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';
export type EventType = 'meeting' | 'reminder' | 'holiday' | 'poya' | 'other';
export type IntegrationProvider = 'google' | 'outlook' | 'apple_feed';
export type SyncStatus = 'success' | 'failed' | 'in_progress';
export type ResponseStatus = 'pending' | 'accepted' | 'declined' | 'maybe';

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  type: CalendarType;
  owner_id?: string;
  department_id?: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  created_by?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  timezone: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  recurrence_end_date?: string;
  parent_event_id?: string;
  status: EventStatus;
  visibility: EventVisibility;
  event_type?: EventType;
  google_event_id?: string;
  external_event_url?: string;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id?: string;
  email?: string;
  response_status: ResponseStatus;
  is_organizer: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventReminder {
  id: string;
  event_id: string;
  user_id: string;
  minutes_before: number;
  method: 'notification' | 'email';
  created_at: string;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  calendar_id: string;
  provider: IntegrationProvider;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  external_calendar_id?: string;
  external_account_email?: string;
  sync_enabled: boolean;
  sync_direction: 'one_way_to_us' | 'one_way_from_us' | 'two_way';
  last_sync_at?: string;
  next_sync_at?: string;
  sync_token?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarSubscription {
  id: string;
  calendar_id: string;
  user_id: string;
  subscription_token: string;
  feed_url: string;
  is_active: boolean;
  include_private_events: boolean;
  refresh_interval_minutes: number;
  last_accessed_at?: string;
  access_count: number;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncLog {
  id: string;
  integration_id: string;
  sync_status: SyncStatus;
  direction?: string;
  events_synced: number;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  error_message?: string;
  error_details?: any;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface CalendarShare {
  id: string;
  calendar_id: string;
  shared_with_user_id: string;
  shared_by_user_id?: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
  created_at: string;
  updated_at: string;
}

// Frontend-specific types
export interface CalendarEventWithDetails extends CalendarEvent {
  calendar?: Calendar;
  attendees?: EventAttendee[];
  reminders?: EventReminder[];
  creator?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateEventInput {
  calendar_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  timezone?: string;
  visibility?: EventVisibility;
  event_type?: EventType;
  attendee_emails?: string[];
  reminder_minutes?: number[];
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
}

export interface GoogleCalendarAuthUrl {
  url: string;
  state: string;
}

export interface GoogleCalendarTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}
