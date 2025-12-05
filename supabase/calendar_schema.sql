-- =============================================
-- CALENDAR INTEGRATION SCHEMA
-- Adds support for personal/shared calendars, Google Calendar integration, and Apple Calendar feeds
-- =============================================

-- Calendar types ENUM
CREATE TYPE calendar_type AS ENUM ('personal', 'shared', 'department');
CREATE TYPE event_visibility AS ENUM ('public', 'private', 'internal');
CREATE TYPE event_status AS ENUM ('confirmed', 'tentative', 'cancelled');
CREATE TYPE integration_provider AS ENUM ('google', 'outlook', 'apple_feed');
CREATE TYPE sync_status AS ENUM ('success', 'failed', 'in_progress');

-- =============================================
-- CALENDARS TABLE
-- =============================================

-- Calendars: Supports personal and shared calendars
CREATE TABLE calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type calendar_type NOT NULL DEFAULT 'personal',
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#3B82F6', -- Hex color for UI display
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure personal calendars have owner, shared/department calendars reference department
  CONSTRAINT personal_calendar_has_owner CHECK (
    (type = 'personal' AND owner_id IS NOT NULL) OR
    (type IN ('shared', 'department') AND department_id IS NOT NULL)
  )
);

-- =============================================
-- CALENDAR EVENTS (Enhanced)
-- =============================================

-- Drop the existing basic events table and create enhanced version
DROP TABLE IF EXISTS events CASCADE;

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'UTC',
  
  -- Recurrence (simplified - can be enhanced with rrule)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- RRULE format (e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR")
  recurrence_end_date TIMESTAMPTZ,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Status and visibility
  status event_status DEFAULT 'confirmed',
  visibility event_visibility DEFAULT 'internal',
  
  -- Integrations
  google_event_id TEXT, -- ID from Google Calendar
  external_event_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Validation
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- =============================================
-- EVENT ATTENDEES
-- =============================================

CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT, -- For external attendees
  response_status TEXT DEFAULT 'pending', -- pending, accepted, declined, maybe
  is_organizer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, email)
);

-- =============================================
-- EVENT REMINDERS
-- =============================================

CREATE TABLE event_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  minutes_before INTEGER NOT NULL, -- e.g., 15, 30, 60, 1440 (1 day)
  method TEXT DEFAULT 'notification', -- notification, email
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, user_id, minutes_before, method)
);

-- =============================================
-- CALENDAR INTEGRATIONS
-- =============================================

CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  
  -- OAuth tokens (encrypted)
  access_token TEXT, -- Encrypted OAuth access token
  refresh_token TEXT, -- Encrypted OAuth refresh token
  token_expires_at TIMESTAMPTZ,
  
  -- Provider-specific data
  external_calendar_id TEXT, -- Calendar ID on external provider
  external_account_email TEXT,
  
  -- Sync settings
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'two_way', -- one_way_to_us, one_way_from_us, two_way
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_token TEXT, -- Provider's sync token for incremental sync
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, provider, external_calendar_id)
);

-- =============================================
-- CALENDAR SUBSCRIPTIONS (for Apple Calendar feeds)
-- =============================================

CREATE TABLE calendar_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Subscription details
  subscription_token TEXT UNIQUE NOT NULL, -- Unique cryptographic token
  feed_url TEXT NOT NULL, -- Generated webcal:// URL
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  include_private_events BOOLEAN DEFAULT false,
  refresh_interval_minutes INTEGER DEFAULT 15,
  
  -- Usage tracking
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(calendar_id, user_id)
);

-- =============================================
-- SYNC LOGS
-- =============================================

CREATE TABLE calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_status sync_status NOT NULL,
  direction TEXT, -- to_external, from_external, both
  events_synced INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Duration
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CALENDAR SHARING
-- =============================================

CREATE TABLE calendar_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Permissions
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(calendar_id, shared_with_user_id)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

-- Calendars: Owner + Shared users + Admins
CREATE POLICY "Users can view own and shared calendars" ON calendars
  FOR SELECT USING (
    owner_id = auth.uid() OR
    type IN ('shared', 'department') OR
    EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = calendars.id AND shared_with_user_id = auth.uid() AND can_view = true) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Users can create personal calendars" ON calendars
  FOR INSERT WITH CHECK (
    (type = 'personal' AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Users can update own calendars" ON calendars
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = calendars.id AND shared_with_user_id = auth.uid() AND can_edit = true) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Users can delete own calendars" ON calendars
  FOR DELETE USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Calendar Events: Based on calendar access
CREATE POLICY "Users can view events in accessible calendars" ON calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendars c 
      WHERE c.id = calendar_events.calendar_id AND (
        c.owner_id = auth.uid() OR
        c.type IN ('shared', 'department') OR
        EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = auth.uid() AND can_view = true) OR
        EXISTS (SELECT 1 FROM event_attendees WHERE event_id = calendar_events.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

CREATE POLICY "Users can create events in editable calendars" ON calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendars c 
      WHERE c.id = calendar_id AND (
        c.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = auth.uid() AND can_edit = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

CREATE POLICY "Users can update events in editable calendars" ON calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM calendars c 
      WHERE c.id = calendar_id AND (
        c.owner_id = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = auth.uid() AND can_edit = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

CREATE POLICY "Users can delete own events or from owned calendars" ON calendar_events
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM calendars c 
      WHERE c.id = calendar_id AND (
        c.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = auth.uid() AND can_delete = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

-- Event Attendees: Based on event access
CREATE POLICY "Users can view attendees of accessible events" ON event_attendees
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM calendar_events WHERE id = event_id) -- Inherits event visibility
  );

CREATE POLICY "Event creators can manage attendees" ON event_attendees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM calendar_events WHERE id = event_id AND created_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Calendar Integrations: Own only
CREATE POLICY "Users can manage own integrations" ON calendar_integrations
  FOR ALL USING (user_id = auth.uid());

-- Calendar Subscriptions: Own only
CREATE POLICY "Users can manage own subscriptions" ON calendar_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Sync Logs: View own integration logs
CREATE POLICY "Users can view own sync logs" ON calendar_sync_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM calendar_integrations WHERE id = integration_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =============================================
-- INDEXES for Performance
-- =============================================

CREATE INDEX idx_calendars_owner ON calendars(owner_id);
CREATE INDEX idx_calendars_department ON calendars(department_id);
CREATE INDEX idx_calendars_type ON calendars(type);

CREATE INDEX idx_calendar_events_calendar ON calendar_events(calendar_id);
CREATE INDEX idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX idx_calendar_events_time_range ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_google_id ON calendar_events(google_event_id) WHERE google_event_id IS NOT NULL;

CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id);

CREATE INDEX idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_calendar ON calendar_integrations(calendar_id);
CREATE INDEX idx_calendar_integrations_next_sync ON calendar_integrations(next_sync_at) WHERE sync_enabled = true;

CREATE INDEX idx_calendar_subscriptions_token ON calendar_subscriptions(subscription_token);
CREATE INDEX idx_calendar_subscriptions_user ON calendar_subscriptions(user_id);

CREATE INDEX idx_calendar_sync_logs_integration ON calendar_sync_logs(integration_id);
CREATE INDEX idx_calendar_sync_logs_created ON calendar_sync_logs(created_at);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE ON calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_attendees_updated_at BEFORE UPDATE ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_subscriptions_updated_at BEFORE UPDATE ON calendar_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default personal calendar for new users
CREATE OR REPLACE FUNCTION create_default_calendar()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO calendars (name, description, type, owner_id, is_default, color)
  VALUES (
    NEW.full_name || '''s Calendar',
    'Primary personal calendar',
    'personal',
    NEW.id,
    true,
    '#3B82F6'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_default_calendar_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_calendar();

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to get user's accessible calendars
CREATE OR REPLACE FUNCTION get_user_calendars(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type calendar_type,
  color TEXT,
  is_default BOOLEAN,
  owner_name TEXT,
  can_edit BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.type,
    c.color,
    c.is_default,
    p.full_name as owner_name,
    CASE
      WHEN c.owner_id = user_uuid THEN true
      WHEN EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = user_uuid AND can_edit = true) THEN true
      ELSE false
    END as can_edit
  FROM calendars c
  LEFT JOIN profiles p ON c.owner_id = p.id
  WHERE 
    c.owner_id = user_uuid OR
    c.type IN ('shared', 'department') OR
    EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = user_uuid)
  ORDER BY c.is_default DESC, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
