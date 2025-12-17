export type UserRole = 'employee' | 'supervisor' | 'admin' | 'super_admin'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  created_at?: string
  updated_at?: string
}

export interface Employee {
  id: string
  employee_id: string
  department_id?: string
  designation_id?: string
  supervisor_id?: string
  date_of_birth?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed'
  joining_date: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
}

export interface Request {
  id: string
  employee_id: string
  request_type: RequestType
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  submitted_at: string
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
}

export type RequestType =
  | 'attendance_regularization'
  | 'document_request'
  | 'asset_request'
  | 'travel_request'
  | 'expense_reimbursement'
  | 'payroll_query'
  | 'resignation'
  | 'overtime'
  | 'leave'
  | 'covering'

export interface LeaveRequest {
  id: string
  request_id: string
  employee_id: string
  leave_type: 'sick' | 'casual' | 'vacation' | 'maternity' | 'paternity' | 'unpaid'
  start_date: string
  end_date: string
  total_days: number
  reason: string
}

export interface AttendanceLog {
  id: string
  employee_id: string
  date: string
  shift_id?: string
  check_in?: string
  check_out?: string
  status: string
  notes?: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  link?: string
  created_at: string
}
