-- Create overtime_salary_approvals table
-- This table tracks which overtime requests have been approved for salary calculation

CREATE TABLE IF NOT EXISTS overtime_salary_approvals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    overtime_request_id uuid NOT NULL REFERENCES overtime_requests(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    approved_by uuid NOT NULL REFERENCES profiles(id),
    approved_at timestamp with time zone DEFAULT now(),
    calculated_amount numeric NOT NULL,
    month varchar NOT NULL, -- Format: YYYY-MM
    salary_payment_id uuid REFERENCES salary_payments(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(overtime_request_id, month) -- Prevent duplicate approvals for same OT in same month
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_overtime_salary_approvals_employee ON overtime_salary_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_salary_approvals_month ON overtime_salary_approvals(month);
CREATE INDEX IF NOT EXISTS idx_overtime_salary_approvals_overtime_request ON overtime_salary_approvals(overtime_request_id);

-- Enable RLS
ALTER TABLE overtime_salary_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view overtime salary approvals" ON overtime_salary_approvals;
DROP POLICY IF EXISTS "Admins can insert overtime salary approvals" ON overtime_salary_approvals;
DROP POLICY IF EXISTS "Admins can update overtime salary approvals" ON overtime_salary_approvals;
DROP POLICY IF EXISTS "Admins can delete overtime salary approvals" ON overtime_salary_approvals;

-- Admins can view all overtime salary approvals
CREATE POLICY "Admins can view overtime salary approvals"
  ON overtime_salary_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can insert overtime salary approvals
CREATE POLICY "Admins can insert overtime salary approvals"
  ON overtime_salary_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can update overtime salary approvals
CREATE POLICY "Admins can update overtime salary approvals"
  ON overtime_salary_approvals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can delete overtime salary approvals
CREATE POLICY "Admins can delete overtime salary approvals"
  ON overtime_salary_approvals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_overtime_salary_approvals_updated_at ON overtime_salary_approvals;
CREATE TRIGGER update_overtime_salary_approvals_updated_at
  BEFORE UPDATE ON overtime_salary_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
