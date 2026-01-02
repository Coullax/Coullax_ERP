-- Migration: Add APIT and attendance salary columns to salary_payments table
-- This allows storing the calculated APIT deduction, attendance salary, and category net values

ALTER TABLE salary_payments 
ADD COLUMN IF NOT EXISTS attendance_salary NUMERIC,
ADD COLUMN IF NOT EXISTS apit_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS apit_percentage NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS category_net NUMERIC DEFAULT 0;

COMMENT ON COLUMN salary_payments.attendance_salary IS 'Attendance-based calculated salary for the month';
COMMENT ON COLUMN salary_payments.apit_deduction IS 'APIT tax deduction amount calculated from base salary';
COMMENT ON COLUMN salary_payments.apit_percentage IS 'APIT tax percentage used for the calculation';
COMMENT ON COLUMN salary_payments.category_net IS 'Net category amount (additions - deductions) from salary categories';
