-- Create attendance_salary table
CREATE TABLE IF NOT EXISTS public.attendance_salary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of the month for the calculation period
  absent_days INTEGER DEFAULT 0,
  half_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  poya_days INTEGER DEFAULT 0,
  holiday_days INTEGER DEFAULT 0,
  unpaid_leave_days INTEGER DEFAULT 0, -- Count of unpaid leaves from leave_requests
  total_working_days INTEGER DEFAULT 0,
  calculated_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_salary_employee_id ON public.attendance_salary(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_salary_month ON public.attendance_salary(month);

-- Add RLS policies
ALTER TABLE public.attendance_salary ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and super admins can view all records
CREATE POLICY "Admins can view attendance salary records"
  ON public.attendance_salary
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and super admins can insert records
CREATE POLICY "Admins can insert attendance salary records"
  ON public.attendance_salary
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and super admins can update records
CREATE POLICY "Admins can update attendance salary records"
  ON public.attendance_salary
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and super admins can delete records
CREATE POLICY "Admins can delete attendance salary records"
  ON public.attendance_salary
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
