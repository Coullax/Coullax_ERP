-- Employee Handbooks Table
CREATE TABLE IF NOT EXISTS public.employee_handbooks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size integer,
  version text,
  uploaded_by uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_handbooks_pkey PRIMARY KEY (id),
  CONSTRAINT employee_handbooks_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.employee_handbooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_handbooks

-- Policy: All authenticated users can view active handbooks
CREATE POLICY "Anyone can view active handbooks"
  ON public.employee_handbooks
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Admins and super admins can view all handbooks
CREATE POLICY "Admins can view all handbooks"
  ON public.employee_handbooks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and super admins can insert handbooks
CREATE POLICY "Admins can insert handbooks"
  ON public.employee_handbooks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and super admins can update handbooks
CREATE POLICY "Admins can update handbooks"
  ON public.employee_handbooks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins and super admins can delete handbooks
CREATE POLICY "Admins can delete handbooks"
  ON public.employee_handbooks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_employee_handbooks_is_active ON public.employee_handbooks(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_handbooks_created_at ON public.employee_handbooks(created_at DESC);
