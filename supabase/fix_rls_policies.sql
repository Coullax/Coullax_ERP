-- Fix RLS Policies for Request Tables
-- Run this in Supabase SQL Editor

-- =============================================
-- REQUEST DETAIL TABLES - Allow employees to INSERT
-- =============================================

-- Fix leave_requests RLS
DROP POLICY IF EXISTS "Users can insert own leave requests" ON leave_requests;
CREATE POLICY "Users can insert own leave requests" ON leave_requests
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
CREATE POLICY "Users can view own leave requests" ON leave_requests
  FOR SELECT USING (auth.uid() = employee_id);

-- Fix overtime_requests RLS
DROP POLICY IF EXISTS "Users can insert own overtime requests" ON overtime_requests;
CREATE POLICY "Users can insert own overtime requests" ON overtime_requests
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own overtime requests" ON overtime_requests;
CREATE POLICY "Users can view own overtime requests" ON overtime_requests
  FOR SELECT USING (auth.uid() = employee_id);

-- Fix travel_requests RLS
DROP POLICY IF EXISTS "Users can insert own travel requests" ON travel_requests;
CREATE POLICY "Users can insert own travel requests" ON travel_requests
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own travel requests" ON travel_requests;
CREATE POLICY "Users can view own travel requests" ON travel_requests
  FOR SELECT USING (auth.uid() = employee_id);

-- Fix expense_reimbursements RLS
DROP POLICY IF EXISTS "Users can insert own expense reimbursements" ON expense_reimbursements;
CREATE POLICY "Users can insert own expense reimbursements" ON expense_reimbursements
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own expense reimbursements" ON expense_reimbursements;
CREATE POLICY "Users can view own expense reimbursements" ON expense_reimbursements
  FOR SELECT USING (auth.uid() = employee_id);

-- Fix attendance_regularization_requests RLS
DROP POLICY IF EXISTS "Users can insert own attendance regularization" ON attendance_regularization_requests;
CREATE POLICY "Users can insert own attendance regularization" ON attendance_regularization_requests
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own attendance regularization" ON attendance_regularization_requests;
CREATE POLICY "Users can view own attendance regularization" ON attendance_regularization_requests
  FOR SELECT USING (auth.uid() = employee_id);

-- Fix asset_requests RLS
DROP POLICY IF EXISTS "Users can insert own asset requests" ON asset_requests;
CREATE POLICY "Users can insert own asset requests" ON asset_requests
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own asset requests" ON asset_requests;
CREATE POLICY "Users can view own asset requests" ON asset_requests
  FOR SELECT USING (auth.uid() = employee_id);

-- Fix resignations RLS
DROP POLICY IF EXISTS "Users can insert own resignation" ON resignations;
CREATE POLICY "Users can insert own resignation" ON resignations
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own resignation" ON resignations;
CREATE POLICY "Users can view own resignation" ON resignations
  FOR SELECT USING (auth.uid() = employee_id);

-- =============================================
-- VERIFICATION TABLES - KYC & BANK DETAILS
-- =============================================

-- Fix kyc_documents RLS
DROP POLICY IF EXISTS "Users can insert own documents" ON kyc_documents;
CREATE POLICY "Users can insert own documents" ON kyc_documents
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own documents" ON kyc_documents;
CREATE POLICY "Users can view own documents" ON kyc_documents
  FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can update own documents" ON kyc_documents;
CREATE POLICY "Users can update own documents" ON kyc_documents
  FOR UPDATE USING (auth.uid() = employee_id);

-- Fix bank_details RLS
DROP POLICY IF EXISTS "Users can insert own bank details" ON bank_details;
CREATE POLICY "Users can insert own bank details" ON bank_details
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own bank details" ON bank_details;
CREATE POLICY "Users can view own bank details" ON bank_details
  FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can update own bank details" ON bank_details;
CREATE POLICY "Users can update own bank details" ON bank_details
  FOR UPDATE USING (auth.uid() = employee_id);

-- =============================================
-- ATTENDANCE LOGS - Allow employees to manage
-- =============================================

DROP POLICY IF EXISTS "Users can insert own attendance" ON attendance_logs;
CREATE POLICY "Users can insert own attendance" ON attendance_logs
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can update own attendance" ON attendance_logs;
CREATE POLICY "Users can update own attendance" ON attendance_logs
  FOR UPDATE USING (auth.uid() = employee_id);

-- =============================================
-- ADMIN POLICIES - View all records
-- =============================================

-- Admin can view all request details
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;
CREATE POLICY "Admins can view all leave requests" ON leave_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can view all overtime requests" ON overtime_requests;
CREATE POLICY "Admins can view all overtime requests" ON overtime_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can view all travel requests" ON travel_requests;
CREATE POLICY "Admins can view all travel requests" ON travel_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can view all expense reimbursements" ON expense_reimbursements;
CREATE POLICY "Admins can view all expense reimbursements" ON expense_reimbursements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can view all attendance regularizations" ON attendance_regularization_requests;
CREATE POLICY "Admins can view all attendance regularizations" ON attendance_regularization_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can view all asset requests" ON asset_requests;
CREATE POLICY "Admins can view all asset requests" ON asset_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can view all resignations" ON resignations;
CREATE POLICY "Admins can view all resignations" ON resignations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Admin can view all KYC documents
DROP POLICY IF EXISTS "Admins can view all documents" ON kyc_documents;
CREATE POLICY "Admins can view all documents" ON kyc_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can update documents" ON kyc_documents;
CREATE POLICY "Admins can update documents" ON kyc_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Admin can view all bank details
DROP POLICY IF EXISTS "Admins can view all bank details" ON bank_details;
CREATE POLICY "Admins can view all bank details" ON bank_details
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =============================================
-- EMPLOYEE DATA ACCESS
-- =============================================

-- Allow users to INSERT their own employee records (for signup)
DROP POLICY IF EXISTS "Users can insert own employee record" ON employees;
CREATE POLICY "Users can insert own employee record" ON employees
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow access to education and skills
DROP POLICY IF EXISTS "Users can insert own education" ON employee_education;
CREATE POLICY "Users can insert own education" ON employee_education
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own education" ON employee_education;
CREATE POLICY "Users can view own education" ON employee_education
  FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can delete own education" ON employee_education;
CREATE POLICY "Users can delete own education" ON employee_education
  FOR DELETE USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can insert own skills" ON employee_skills;
CREATE POLICY "Users can insert own skills" ON employee_skills
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can view own skills" ON employee_skills;
CREATE POLICY "Users can view own skills" ON employee_skills
  FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can delete own skills" ON employee_skills;
CREATE POLICY "Users can delete own skills" ON employee_skills
  FOR DELETE USING (auth.uid() = employee_id);

-- =============================================
-- DEPARTMENTS & DESIGNATIONS MANAGEMENT
-- =============================================

-- Super admins can manage departments
DROP POLICY IF EXISTS "Super admins can view departments" ON departments;
CREATE POLICY "Super admins can view departments" ON departments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Super admins can insert departments" ON departments;
CREATE POLICY "Super admins can insert departments" ON departments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admins can update departments" ON departments;
CREATE POLICY "Super admins can update departments" ON departments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admins can delete departments" ON departments;
CREATE POLICY "Super admins can delete departments" ON departments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Allow employees to view departments
DROP POLICY IF EXISTS "Employees can view departments" ON departments;
CREATE POLICY "Employees can view departments" ON departments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Super admins can manage designations
DROP POLICY IF EXISTS "Super admins can view designations" ON designations;
CREATE POLICY "Super admins can view designations" ON designations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Super admins can insert designations" ON designations;
CREATE POLICY "Super admins can insert designations" ON designations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admins can update designations" ON designations;
CREATE POLICY "Super admins can update designations" ON designations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admins can delete designations" ON designations;
CREATE POLICY "Super admins can delete designations" ON designations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Allow employees to view designations
DROP POLICY IF EXISTS "Employees can view designations" ON designations;
CREATE POLICY "Employees can view designations" ON designations
  FOR SELECT USING (auth.role() = 'authenticated');
