-- Allow viewing of PUBLIC events regardless of calendar ownership
DROP POLICY IF EXISTS "Users can view events in accessible calendars" ON calendar_events;

CREATE POLICY "Users can view events in accessible calendars" ON calendar_events
  FOR SELECT USING (
    visibility = 'public' OR
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
