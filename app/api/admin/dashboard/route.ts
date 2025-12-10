import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user and verify admin/super_admin
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

    // Get request type distribution
    const { data: requestTypeData, error: requestTypeError } = await supabase
      .from('requests')
      .select('request_type')

    if (requestTypeError) {
      console.error('Error fetching request types:', requestTypeError)
    }

    // Count requests by type
    const requestTypeCounts: Record<string, number> = {}
    requestTypeData?.forEach((req) => {
      const type = req.request_type
      requestTypeCounts[type] = (requestTypeCounts[type] || 0) + 1
    })

    // Format for chart
    const requestDistribution = Object.entries(requestTypeCounts).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      value
    }))

    // Get recent requests with employee details
    const { data: recentRequests, error: recentError } = await supabase
      .from('requests')
      .select(`
        id,
        request_type,
        status,
        submitted_at,
        employee_id
      `)
      .order('submitted_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('Error fetching recent requests:', recentError)
    }

    // Fetch employee profiles for recent requests
    const employeeIds = recentRequests?.map(req => req.employee_id).filter(Boolean) || []
    const { data: employees } = await supabase
      .from('employees')
      .select(`
        id,
        profile:profiles!employees_id_fkey(
          full_name,
          email
        )
      `)
      .in('id', employeeIds)

    // Create employee lookup map
    const employeeMap = new Map()
    employees?.forEach((emp: any) => {
      employeeMap.set(emp.id, emp.profile?.full_name || 'Unknown')
    })

    // Format recent requests
    const formattedRequests = recentRequests?.map(req => {
      return {
        id: req.id,
        type: req.request_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        employee: employeeMap.get(req.employee_id) || 'Unknown',
        status: req.status,
        date: req.submitted_at
      }
    }) || []

    // Get total employees count
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })

    // Get pending requests count
    const { count: pendingRequests } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return NextResponse.json({
      requestDistribution,
      recentRequests: formattedRequests,
      stats: {
        totalEmployees: totalEmployees || 0,
        pendingRequests: pendingRequests || 0
      }
    })
  } catch (error: any) {
    console.error('Error in admin dashboard API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
