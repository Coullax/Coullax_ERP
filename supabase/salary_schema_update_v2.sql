-- Add columns for multi-step approval flow
ALTER TABLE salary_payments
ADD COLUMN IF NOT EXISTS employee_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_approval_status TEXT DEFAULT 'pending' CHECK (admin_approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_approved_by UUID REFERENCES profiles(id);

-- Update RLS to ensure Admins can update these new columns
-- (Existing "Admins can manage salary payments" policy should cover ALL operations, so usually no change needed if it was FOR ALL)
-- Just ensuring the check constraint doesn't conflict with existing data (defaults to pending).
