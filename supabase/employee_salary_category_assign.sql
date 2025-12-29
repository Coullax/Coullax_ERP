-- Employee Salary Category Assignment Table
-- This table tracks which employees are assigned to which salary categories

CREATE TABLE IF NOT EXISTS employee_salary_category_assign (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES salary_categories(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate assignments
  UNIQUE(employee_id, category_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employee_salary_category_assign_employee ON employee_salary_category_assign(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_category_assign_category ON employee_salary_category_assign(category_id);

-- Enable Row Level Security
ALTER TABLE employee_salary_category_assign ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view employee salary category assignments" ON employee_salary_category_assign;
DROP POLICY IF EXISTS "Admins can insert employee salary category assignments" ON employee_salary_category_assign;
DROP POLICY IF EXISTS "Admins can update employee salary category assignments" ON employee_salary_category_assign;
DROP POLICY IF EXISTS "Admins can delete employee salary category assignments" ON employee_salary_category_assign;

-- Allow admins to view all assignments
CREATE POLICY "Admins can view employee salary category assignments"
  ON employee_salary_category_assign FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Allow admins to insert assignments
CREATE POLICY "Admins can insert employee salary category assignments"
  ON employee_salary_category_assign FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Allow admins to update assignments
CREATE POLICY "Admins can update employee salary category assignments"
  ON employee_salary_category_assign FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Allow admins to delete assignments
CREATE POLICY "Admins can delete employee salary category assignments"
  ON employee_salary_category_assign FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_employee_salary_category_assign_updated_at ON employee_salary_category_assign;
CREATE TRIGGER update_employee_salary_category_assign_updated_at
  BEFORE UPDATE ON employee_salary_category_assign
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
