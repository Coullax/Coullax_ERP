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

    // Get user's document requests
    const { data: requests, error } = await supabase
      .from('document_requests')
      .select(`
        *,
        fulfiller:profiles!document_requests_fulfilled_by_fkey(full_name),
        document:documents!document_requests_document_id_fkey(id, title, file_url, file_type)
      `)
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching document requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error: any) {
    console.error('Error in GET document requests:', error)
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
    const { request_type, title, description } = body

    if (!request_type || !title) {
      return NextResponse.json({ error: 'Request type and title are required' }, { status: 400 })
    }

    // Create document request
    const { data: docRequest, error } = await supabase
      .from('document_requests')
      .insert({
        employee_id: user.id,
        request_type,
        title,
        description,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating document request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user profile for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Create notification for admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'super_admin'])

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title: 'New Document Request',
        message: `${profile?.full_name || 'An employee'} requested: ${title}`,
        type: 'document_request',
        link: '/admin/document-requests'
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json(docRequest, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST document request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
