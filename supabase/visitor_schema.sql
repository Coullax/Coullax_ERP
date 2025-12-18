-- =============================================
-- VISITOR MANAGEMENT SCHEMA
-- =============================================

CREATE TYPE visitor_status AS ENUM ('scheduled', 'checked_in', 'checked_out', 'cancelled');

CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  identification_id TEXT, -- NIC, Passport, Driving License, etc.
  company_name TEXT,
  
  -- Visit Details
  purpose TEXT NOT NULL,
  host_employee_id UUID REFERENCES employees(id),
  
  -- Timing
  scheduled_arrival TIMESTAMPTZ NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  
  -- Status
  status visitor_status DEFAULT 'scheduled',
  
  -- Tracking
  badge_number TEXT,
  notes TEXT,
  
  -- Auditing
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Admins can view all visitors
CREATE POLICY "Admins can view all visitors" ON visitors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Admins can insert visitors
CREATE POLICY "Admins can insert visitors" ON visitors
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Admins can update visitors
CREATE POLICY "Admins can update visitors" ON visitors
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Admins can delete visitors
CREATE POLICY "Admins can delete visitors" ON visitors
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Employees can view visitors where they are the host
CREATE POLICY "Employees can view their visitors" ON visitors
  FOR SELECT USING (
    host_employee_id = auth.uid()
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
