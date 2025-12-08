import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

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

    const body = await request.json()
    const { action, document_id, rejection_reason } = body

    if (action === 'fulfill' && document_id) {
      // Fulfill the request
      const { data: updatedRequest, error } = await supabase
        .from('document_requests')
        .update({
          status: 'fulfilled',
          fulfilled_by: user.id,
          fulfilled_at: new Date().toISOString(),
          document_id
        })
        .eq('id', id)
        .select(`
          *,
          employee:employees!document_requests_employee_id_fkey(
            profiles:profiles(full_name)
          ),
          document:documents(id, title, file_url)
        `)
        .single()

      if (error) {
        console.error('Error fulfilling request:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(updatedRequest)
    } else if (action === 'reject' && rejection_reason) {
      // Reject the request
      const { data: updatedRequest, error } = await supabase
        .from('document_requests')
        .update({
          status: 'rejected',
          fulfilled_by: user.id,
          fulfilled_at: new Date().toISOString(),
          rejection_reason
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error rejecting request:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Create notification for employee
      await supabase.from('notifications').insert({
        user_id: updatedRequest.employee_id,
        title: 'Document Request Rejected',
        message: `Your request has been rejected. Reason: ${rejection_reason}`,
        type: 'document_request',
        link: '/documents?tab=requests'
      })

      return NextResponse.json(updatedRequest)
    } else {
      return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error in PATCH document request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
