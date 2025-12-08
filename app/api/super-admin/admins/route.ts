import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

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

    // Get all admins and super admins
    const { data: admins, error } = await supabase
      .from('profiles')
      .select(`
        *,
        employee:employees!employees_id_fkey(
          employee_id,
          department_id,
          designation_id,
          joining_date
        )
      `)
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admins:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ admins: admins || [] })
  } catch (error: any) {
    console.error('Error in GET admins:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

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

    const body = await request.json()
    const { user_id, role } = body

    if (!user_id || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 })
    }

    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Update user role
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user_id)
      .select()
      .single()

    if (error) {
      console.error('Error promoting to admin:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updatedProfile, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST admin:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
