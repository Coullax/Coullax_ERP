import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient() // For operations that bypass RLS
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
            id,
            employee_id,
            profiles!employees_id_fkey(full_name)
          ),
          document:documents!document_requests_document_id_fkey(id, title, file_url)
        `)
        .single()

      if (error) {
        console.error('Error fulfilling request:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Create notification for employee (non-blocking)
      // Extract employee_id - it might be nested in the employee object
      const employeeId = updatedRequest.employee_id || updatedRequest.employee?.id

      if (employeeId) {
        const { error: notifError } = await adminClient.from('notifications').insert({
          user_id: employeeId,
          title: 'Document Request Fulfilled',
          message: `Your document request "${updatedRequest.title}" has been fulfilled.`,
          type: 'document_request',
          link: '/documents?tab=requests'
        })

        if (notifError) {
          console.error('Failed to create notification:', notifError)
          console.error('Employee ID used:', employeeId)
          console.error('Admin client auth:', await adminClient.auth.getUser())
          // Don't fail the request if notification creation fails
        }
      } else {
        console.error('No employee_id found in updatedRequest:', updatedRequest)
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

      // Create notification for employee (non-blocking)
      const employeeId = updatedRequest.employee_id

      if (employeeId) {
        const { error: notifError } = await adminClient.from('notifications').insert({
          user_id: employeeId,
          title: 'Document Request Rejected',
          message: `Your request has been rejected. Reason: ${rejection_reason}`,
          type: 'document_request',
          link: '/documents?tab=requests'
        })

        if (notifError) {
          console.error('Failed to create notification:', notifError)
          console.error('Employee ID used:', employeeId)
          // Don't fail the request if notification creation fails
        }
      } else {
        console.error('No employee_id found in updatedRequest:', updatedRequest)
      }

      return NextResponse.json(updatedRequest)
    } else {
      return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error in PATCH document request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
