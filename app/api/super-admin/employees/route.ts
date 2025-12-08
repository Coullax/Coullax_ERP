import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

    // Get all employees (non-admins) for promoting
    const { data: employees, error } = await supabase
      .from('profiles')
      .select(`
        *,
        employee:employees!employees_id_fkey(
          employee_id,
          department_id,
          designation_id
        )
      `)
      .eq('role', 'employee')
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ employees: employees || [] })
  } catch (error: any) {
    console.error('Error in GET employees:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
