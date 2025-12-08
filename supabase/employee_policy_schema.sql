-- Employee Policy Management Schema
-- This schema manages employee leave policies and leave balances

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE policy_type AS ENUM ('5_day_permanent', '6_day_permanent', 'intern', 'contract');
CREATE TYPE renewal_period AS ENUM ('yearly', 'custom');

-- =============================================
-- EMPLOYEE POLICIES TABLE
-- =============================================

CREATE TABLE employee_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  policy_type policy_type NOT NULL,
  working_days_per_week INTEGER NOT NULL CHECK (working_days_per_week BETWEEN 1 AND 7),
  leave_days_per_month DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK (leave_days_per_month >= 0),
  carry_forward_enabled BOOLEAN DEFAULT true,
  renewal_period renewal_period DEFAULT 'yearly',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EMPLOYEE LEAVE BALANCE TABLE
-- =============================================

CREATE TABLE employee_leave_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  policy_id UUID REFERENCES employee_policies(id) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  total_leaves DECIMAL(5,2) NOT NULL DEFAULT 0,
  used_leaves DECIMAL(5,2) NOT NULL DEFAULT 0,
  available_leaves DECIMAL(5,2) NOT NULL DEFAULT 0,
  carried_forward_leaves DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- =============================================
-- UPDATE EMPLOYEES TABLE
-- =============================================

-- Add policy columns to employees table
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES employee_policies(id),
  ADD COLUMN IF NOT EXISTS policy_assigned_date DATE;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE employee_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_balance ENABLE ROW LEVEL SECURITY;

-- Employee Policies: Viewable by all authenticated users, manageable by admins only
CREATE POLICY "Authenticated users can view policies" ON employee_policies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can create policies" ON employee_policies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can update policies" ON employee_policies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can delete policies" ON employee_policies
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Employee Leave Balance: Employees can view own, admins can view all
CREATE POLICY "Employees can view own leave balance" ON employee_leave_balance
  FOR SELECT USING (
    employee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can manage leave balances" ON employee_leave_balance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to automatically calculate available leaves
CREATE OR REPLACE FUNCTION calculate_available_leaves()
RETURNS TRIGGER AS $$
BEGIN
  NEW.available_leaves = NEW.total_leaves - NEW.used_leaves;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update available leaves before insert/update
CREATE TRIGGER update_available_leaves_on_change
  BEFORE INSERT OR UPDATE ON employee_leave_balance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_available_leaves();

-- Apply updated_at trigger to employee_policies
CREATE TRIGGER update_employee_policies_updated_at 
  BEFORE UPDATE ON employee_policies
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to employee_leave_balance
CREATE TRIGGER update_employee_leave_balance_updated_at 
  BEFORE UPDATE ON employee_leave_balance
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INDEXES for Performance
-- =============================================

CREATE INDEX idx_employee_policies_type ON employee_policies(policy_type);
CREATE INDEX idx_employee_policies_active ON employee_policies(is_active);
CREATE INDEX idx_employee_leave_balance_employee ON employee_leave_balance(employee_id);
CREATE INDEX idx_employee_leave_balance_date ON employee_leave_balance(month, year);
CREATE INDEX idx_employee_leave_balance_policy ON employee_leave_balance(policy_id);
CREATE INDEX idx_employees_policy ON employees(policy_id);

-- =============================================
-- INITIAL SAMPLE DATA
-- =============================================

-- Insert default policies
INSERT INTO employee_policies (name, policy_type, working_days_per_week, leave_days_per_month, carry_forward_enabled, description) VALUES
  ('5 Day Workers - Permanent', '5_day_permanent', 5, 2.00, true, '2 day leave per month, carry forward enabled, renewed every year'),
  ('6 Day Workers - Permanent', '6_day_permanent', 6, 2.00, true, '2 day leave per month, carry forward enabled, renewed every year'),
  ('Interns', 'intern', 5, 0.00, false, '0 day leave per month, renewed every year'),
  ('Contract Workers', 'contract', 5, 0.00, true, 'Customized based on working days, can be modified per employee');

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE employee_policies IS 'Stores different leave policies for employees';
COMMENT ON TABLE employee_leave_balance IS 'Tracks monthly leave balance for each employee with carry-forward support';
COMMENT ON COLUMN employee_leave_balance.total_leaves IS 'Total leaves allocated for the month including carried forward leaves';
COMMENT ON COLUMN employee_leave_balance.carried_forward_leaves IS 'Leaves carried forward from previous month';
COMMENT ON COLUMN employee_leave_balance.available_leaves IS 'Automatically calculated as total_leaves - used_leaves';
