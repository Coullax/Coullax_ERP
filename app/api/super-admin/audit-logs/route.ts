import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resource_type')
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get current user and verify super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles!audit_logs_user_id_fkey(
          full_name,
          email,
          avatar_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (action) {
      query = query.eq('action', action)
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: logs, error, count } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      logs: logs || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error: any) {
    console.error('Error in GET audit logs:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, resource_type, resource_id, old_values, new_values } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    // Create audit log
    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating audit log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(log, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST audit log:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
