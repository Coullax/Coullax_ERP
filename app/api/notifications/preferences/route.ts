import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's notification preferences
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        email_enabled: true,
        push_enabled: true,
        leave_updates: true,
        attendance_alerts: true,
        meeting_reminders: true,
        announcements: true
      })
    }

    return NextResponse.json(preferences)
  } catch (error: any) {
    console.error('Error in GET preferences:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email_enabled,
      push_enabled,
      leave_updates,
      attendance_alerts,
      meeting_reminders,
      announcements
    } = body

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        email_enabled,
        push_enabled,
        leave_updates,
        attendance_alerts,
        meeting_reminders,
        announcements,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(preferences)
  } catch (error: any) {
    console.error('Error in PATCH preferences:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
