-- Salary Setup Schema
-- This schema supports dynamic salary categories, salary ranges, and calculation rules

-- =====================================================
-- Table: salary_categories
-- Stores salary calculation categories (deductions, additions, allowances)
-- =====================================================
CREATE TABLE IF NOT EXISTS salary_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category_type TEXT NOT NULL CHECK (category_type IN ('deduction', 'addition', 'allowance')),
  is_percentage_based BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: salary_ranges
-- Defines salary range brackets for different calculation rules
-- =====================================================
CREATE TABLE IF NOT EXISTS salary_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_amount NUMERIC(12, 2) NOT NULL CHECK (min_amount >= 0),
  max_amount NUMERIC(12, 2) CHECK (max_amount IS NULL OR max_amount > min_amount),
  percentage NUMERIC(5, 2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: salary_category_rules
-- Defines calculation rules for each category within salary ranges
-- =====================================================
CREATE TABLE IF NOT EXISTS salary_category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES salary_categories(id) ON DELETE CASCADE,
  salary_range_id UUID REFERENCES salary_ranges(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('percentage', 'fixed')),
  value NUMERIC(12, 4) NOT NULL CHECK (value >= 0),
  applies_to_category_id UUID REFERENCES salary_categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_salary_categories_type ON salary_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_salary_ranges_amounts ON salary_ranges(min_amount, max_amount);
CREATE INDEX IF NOT EXISTS idx_salary_category_rules_category ON salary_category_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_salary_category_rules_range ON salary_category_rules(salary_range_id);

-- =====================================================
-- Updated At Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- Triggers for Updated At
-- =====================================================
DROP TRIGGER IF EXISTS update_salary_categories_updated_at ON salary_categories;
CREATE TRIGGER update_salary_categories_updated_at
    BEFORE UPDATE ON salary_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_salary_ranges_updated_at ON salary_ranges;
CREATE TRIGGER update_salary_ranges_updated_at
    BEFORE UPDATE ON salary_ranges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_salary_category_rules_updated_at ON salary_category_rules;
CREATE TRIGGER update_salary_category_rules_updated_at
    BEFORE UPDATE ON salary_category_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE salary_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_category_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admins to view salary categories" ON salary_categories;
DROP POLICY IF EXISTS "Allow admins to insert salary categories" ON salary_categories;
DROP POLICY IF EXISTS "Allow admins to update salary categories" ON salary_categories;
DROP POLICY IF EXISTS "Allow admins to delete salary categories" ON salary_categories;

DROP POLICY IF EXISTS "Allow admins to view salary ranges" ON salary_ranges;
DROP POLICY IF EXISTS "Allow admins to insert salary ranges" ON salary_ranges;
DROP POLICY IF EXISTS "Allow admins to update salary ranges" ON salary_ranges;
DROP POLICY IF EXISTS "Allow admins to delete salary ranges" ON salary_ranges;

DROP POLICY IF EXISTS "Allow admins to view salary category rules" ON salary_category_rules;
DROP POLICY IF EXISTS "Allow admins to insert salary category rules" ON salary_category_rules;
DROP POLICY IF EXISTS "Allow admins to update salary category rules" ON salary_category_rules;
DROP POLICY IF EXISTS "Allow admins to delete salary category rules" ON salary_category_rules;

-- Salary Categories Policies
CREATE POLICY "Allow admins to view salary categories"
  ON salary_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to insert salary categories"
  ON salary_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to update salary categories"
  ON salary_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to delete salary categories"
  ON salary_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Salary Ranges Policies
CREATE POLICY "Allow admins to view salary ranges"
  ON salary_ranges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to insert salary ranges"
  ON salary_ranges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to update salary ranges"
  ON salary_ranges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to delete salary ranges"
  ON salary_ranges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Salary Category Rules Policies
CREATE POLICY "Allow admins to view salary category rules"
  ON salary_category_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to insert salary category rules"
  ON salary_category_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to update salary category rules"
  ON salary_category_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to delete salary category rules"
  ON salary_category_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- Sample Data (Optional - can be removed after testing)
-- =====================================================

-- Sample Categories
INSERT INTO salary_categories (name, description, category_type, is_percentage_based) VALUES
  ('Basic Salary', 'Base salary amount', 'addition', false),
  ('EPF (Employee)', 'Employee Provident Fund - Employee Contribution', 'deduction', true),
  ('EPF (Employer)', 'Employee Provident Fund - Employer Contribution', 'deduction', true),
  ('ETF', 'Employee Trust Fund', 'deduction', true),
  ('APIT', 'Advanced Personal Income Tax', 'deduction', true),
  ('Transport Allowance', 'Monthly transport allowance', 'allowance', false),
  ('Meal Allowance', 'Daily meal allowance', 'allowance', false)
ON CONFLICT (name) DO NOTHING;

-- Sample Salary Ranges
INSERT INTO salary_ranges (name, min_amount, max_amount, percentage) VALUES
  ('Range 1: 0 - 50,000', 0, 50000, 0),
  ('Range 2: 50,001 - 100,000', 50001, 100000, 6),
  ('Range 3: 100,001 - 200,000', 100001, 200000, 12),
  ('Range 4: 200,001+', 200001, NULL, 18);

