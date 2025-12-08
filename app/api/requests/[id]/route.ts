import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { request_data } = body

    // Check if request exists and is owned by user
    const { data: existingRequest, error: fetchError } = await supabase
      .from('requests')
      .select('id, employee_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only allow editing if request is pending and belongs to user
    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending requests can be edited' }, { status: 403 })
    }

    if (existingRequest.employee_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own requests' }, { status: 403 })
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('requests')
      .update({ request_data })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating request:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updatedRequest)
  } catch (error: any) {
    console.error('Error in PATCH request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if request exists and is owned by user
    const { data: existingRequest, error: fetchError } = await supabase
      .from('requests')
      .select('id, employee_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only allow deletion if request is pending and belongs to user
    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending requests can be deleted' }, { status: 403 })
    }

    if (existingRequest.employee_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own requests' }, { status: 403 })
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('requests')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting request:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
