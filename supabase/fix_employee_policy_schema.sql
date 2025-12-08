-- Migration Script: Fix Employee Policy Schema
-- This script migrates from old policy_type enum values to new values
-- Old: '5_day_permanent', '6_day_permanent', 'intern', 'contract'
-- New: 'permanent', 'intern', 'contract', 'parttime'

-- =============================================
-- STEP 1: Convert column to text temporarily
-- =============================================

-- Convert policy_type column to text
ALTER TABLE employee_policies 
  ALTER COLUMN policy_type TYPE TEXT;

-- =============================================
-- STEP 2: Update existing data
-- =============================================

-- Update policy_type values
UPDATE employee_policies 
SET policy_type = 'permanent'
WHERE policy_type IN ('5_day_permanent', '6_day_permanent');

-- Note: 'intern' and 'contract' remain the same

-- =============================================
-- STEP 3: Recreate the policy_type enum
-- =============================================

-- Drop old enum type (safe now since column is text)
DROP TYPE IF EXISTS policy_type;

-- Create new enum type with updated values
CREATE TYPE policy_type AS ENUM ('permanent', 'intern', 'contract', 'parttime');

-- Convert the column back to enum using the new type
ALTER TABLE employee_policies 
  ALTER COLUMN policy_type TYPE policy_type 
  USING policy_type::policy_type;

-- =============================================
-- STEP 3: Update sample data
-- =============================================

-- Delete old sample policies
DELETE FROM employee_policies 
WHERE name IN (
  '5 Day Workers - Permanent',
  '6 Day Workers - Permanent',
  'Interns',
  'Contract Workers'
);

-- Insert new sample policies
INSERT INTO employee_policies (name, policy_type, working_days_per_week, leave_days_per_month, carry_forward_enabled, description) VALUES
  ('Permanent - 5 Day Work', 'permanent', 5, 2.00, true, '2 day leave per month, carry forward enabled, renewed every year'),
  ('Permanent - 6 Day Work', 'permanent', 6, 2.00, true, '2 day leave per month, carry forward enabled, renewed every year'),
  ('Intern', 'intern', 5, 0.00, false, '0 day leave per month, renewed every year'),
  ('Contract Worker', 'contract', 5, 0.00, true, 'Customized based on working days, can be modified per employee'),
  ('Part Time Worker', 'parttime', 5, 1.00, true, '1 day leave per month for part time workers')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify the enum values
SELECT enum_range(NULL::policy_type);

-- Verify the updated policies
SELECT id, name, policy_type, working_days_per_week, leave_days_per_month 
FROM employee_policies 
ORDER BY policy_type, name;
