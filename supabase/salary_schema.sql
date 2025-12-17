-- Salary Configuration Table
CREATE TABLE salaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  base_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'LKR',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring_allowances JSONB DEFAULT '[]'::jsonb, -- Array of { name, amount, type }
  recurring_deductions JSONB DEFAULT '[]'::jsonb, -- Array of { name, amount, type }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Salary Payments / Payroll History Table
CREATE TABLE salary_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  base_amount DECIMAL(12, 2) NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL,
  net_amount DECIMAL(12, 2) NOT NULL,
  
  -- Breakdown of components
  additions JSONB DEFAULT '[]'::jsonb, -- Bonuses, Allowances
  deductions JSONB DEFAULT '[]'::jsonb, -- Tax, Leaves, No Pay
  
  status TEXT DEFAULT 'draft', -- draft, paid
  payment_date DATE,
  notes TEXT,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(employee_id, month)
);

-- RLS Policies for Salaries
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage salaries" ON salaries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Employees can view own salary config" ON salaries
  FOR SELECT USING (employee_id = auth.uid());

-- RLS Policies for Salary Payments
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage salary payments" ON salary_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Employees can view own salary payments" ON salary_payments
  FOR SELECT USING (employee_id = auth.uid() AND status = 'paid');

-- Triggers for updated_at
CREATE TRIGGER update_salaries_updated_at BEFORE UPDATE ON salaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_payments_updated_at BEFORE UPDATE ON salary_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
