import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Get current user and verify admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('document_requests')
      .select(`
        *,
        employee:employees!document_requests_employee_id_fkey(
          id,
          employee_id,
          profiles:profiles!employees_id_fkey(full_name, avatar_url)
        ),
        fulfiller:profiles!document_requests_fulfilled_by_fkey(full_name),
        document:documents!document_requests_document_id_fkey(id, title, file_url, file_type, file_size)
      `)
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching document requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error: any) {
    console.error('Error in GET admin document requests:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
