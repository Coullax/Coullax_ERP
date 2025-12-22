-- Add employee_type column to employees table

-- First, create the enum type for employee_type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_type') THEN
        CREATE TYPE employee_type AS ENUM ('intern_trainee', 'freelancer', 'permanent', 'contract');
    END IF;
END $$;

-- Add employee_type column to employees table with default value 'permanent'
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS employee_type employee_type DEFAULT 'permanent' NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.employees.employee_type IS 'Type of employment: intern_trainee, freelancer, or permanent. Defaults to permanent for non-employee roles.';
