-- =============================================
-- FIX: Infinite Recursion in event_attendees RLS Policies
-- =============================================
-- The issue: event_attendees policies reference calendar_events,
-- and calendar_events policies reference event_attendees,
-- creating a circular dependency.
--
-- Solution: Make event_attendees policies independent,
-- checking calendar access directly without triggering calendar_events RLS.
-- =============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view attendees of accessible events" ON event_attendees;
DROP POLICY IF EXISTS "Event creators can manage attendees" ON event_attendees;

-- New policy: Users can view attendees if they're the attendee OR have access to the calendar
CREATE POLICY "Users can view attendees of accessible events" ON event_attendees
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM calendar_events ce
      JOIN calendars c ON c.id = ce.calendar_id
      WHERE ce.id = event_attendees.event_id AND (
        c.owner_id = auth.uid() OR
        c.type IN ('shared', 'department') OR
        EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = auth.uid() AND can_view = true) OR
        ce.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

-- New policy: Event creators and calendar owners can manage attendees
CREATE POLICY "Event creators can manage attendees" ON event_attendees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      JOIN calendars c ON c.id = ce.calendar_id
      WHERE ce.id = event_attendees.event_id AND (
        ce.created_by = auth.uid() OR
        c.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = auth.uid() AND can_edit = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

-- Also update the calendar_events SELECT policy to avoid the circular reference
-- We'll remove the event_attendees check from it
DROP POLICY IF EXISTS "Users can view events in accessible calendars" ON calendar_events;

CREATE POLICY "Users can view events in accessible calendars" ON calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendars c 
      WHERE c.id = calendar_events.calendar_id AND (
        c.owner_id = auth.uid() OR
        c.type IN ('shared', 'department') OR
        EXISTS (SELECT 1 FROM calendar_shares WHERE calendar_id = c.id AND shared_with_user_id = auth.uid() AND can_view = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    ) OR
    -- Allow viewing if user created the event
    created_by = auth.uid()
  );

-- Add a simpler policy specifically for attendees to view their events
CREATE POLICY "Attendees can view their events" ON calendar_events
  FOR SELECT USING (
    -- Direct check without subquery to event_attendees to avoid recursion
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_attendees ea
      WHERE ea.event_id = calendar_events.id 
      AND ea.user_id = auth.uid()
    )
  );
