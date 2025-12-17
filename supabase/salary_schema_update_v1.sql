-- Add employee status tracking to salary payments
ALTER TABLE salary_payments 
ADD COLUMN IF NOT EXISTS employee_status TEXT DEFAULT 'pending' CHECK (employee_status IN ('pending', 'approved', 'disputed')),
ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- Update RLS to allow employees to update their own payment status (for approval/dispute)
-- But only specific columns. Since Supabase RLS is row-based, we can control this via a specific policy 
-- or by creating a stored procedure/RPC. 
-- For simplicity in standard Supabase client usage without RPC:
-- We grant UPDATE on salary_payments to authenticated users where they own the record.

CREATE POLICY "Employees can acknowledge own salary payments" ON salary_payments
  FOR UPDATE USING (
    employee_id = auth.uid() AND status = 'paid'
  )
  WITH CHECK (
    employee_id = auth.uid() AND status = 'paid'
  );
