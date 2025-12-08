-- =============================================
-- DOCUMENTS MODULE - Schema Extensions
-- =============================================
-- This extends the existing documents schema with categories, 
-- requests workflow, and version control

-- =============================================
-- DOCUMENT CATEGORIES
-- =============================================

CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO document_categories (name, description, icon, color) VALUES
  ('Payroll', 'Paysheets, salary slips, tax documents', 'Wallet', 'emerald'),
  ('HR Documents', 'Employment contracts, policies, handbooks', 'Users', 'blue'),
  ('Compliance', 'Certifications, licenses, insurance', 'Shield', 'purple'),
  ('Training', 'Training materials, certificates', 'GraduationCap', 'orange'),
  ('Company Documents', 'Announcements, memos, reports', 'Building2', 'indigo'),
  ('Personal Documents', 'ID proofs, address proofs', 'FileText', 'gray');

-- =============================================
-- DOCUMENT REQUESTS
-- =============================================

CREATE TYPE document_request_status AS ENUM ('pending', 'fulfilled', 'rejected');
CREATE TYPE document_request_type AS ENUM (
  'paysheet',
  'salary_slip',
  'experience_letter',
  'relieving_letter',
  'appointment_letter',
  'tax_document',
  'certificate',
  'other'
);

CREATE TABLE document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  request_type document_request_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status document_request_status DEFAULT 'pending' NOT NULL,
  fulfilled_by UUID REFERENCES profiles(id),
  fulfilled_at TIMESTAMPTZ,
  rejection_reason TEXT,
  document_id UUID REFERENCES documents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DOCUMENT VERSIONS
-- =============================================

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  change_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

-- =============================================
-- UPDATE EXISTING DOCUMENTS TABLE
-- =============================================

-- Add new columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES document_categories(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES document_requests(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags TEXT[];

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Full-text search indexes
CREATE INDEX idx_documents_title_description ON documents USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_documents_tags ON documents USING gin(tags);

-- Query optimization indexes
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_uploaded_by_created ON documents(uploaded_by, created_at DESC);
CREATE INDEX idx_documents_is_public ON documents(is_public);
CREATE INDEX idx_document_requests_employee ON document_requests(employee_id, status);
CREATE INDEX idx_document_requests_status ON document_requests(status);
CREATE INDEX idx_document_versions_document ON document_versions(document_id, version_number DESC);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Document Categories: Viewable by all authenticated users
CREATE POLICY "Categories viewable by authenticated users" ON document_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage categories" ON document_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Document Requests: Users can view own, admins can view all
CREATE POLICY "Users can view own document requests" ON document_requests
  FOR SELECT USING (
    employee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Users can create document requests" ON document_requests
  FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins can update document requests" ON document_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Document Versions: Viewable by users who can view parent document
CREATE POLICY "Users can view versions of accessible documents" ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d WHERE d.id = document_versions.document_id AND (
        d.is_public = true OR
        d.uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM document_access WHERE document_id = d.id AND user_id = auth.uid() AND can_view = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

CREATE POLICY "Users can add versions to own documents" ON document_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d WHERE d.id = document_versions.document_id AND (
        d.uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM document_access WHERE document_id = d.id AND user_id = auth.uid() AND can_edit = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

-- =============================================
-- ADDITIONAL POLICIES FOR DOCUMENTS TABLE
-- =============================================

-- Allow users to insert documents
CREATE POLICY "Authenticated users can upload documents" ON documents
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND uploaded_by = auth.uid()
  );

-- Allow document owners and editors to update
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM document_access WHERE document_id = documents.id AND user_id = auth.uid() AND can_edit = true) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Allow document owners and admins to delete
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM document_access WHERE document_id = documents.id AND user_id = auth.uid() AND can_delete = true) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Additional policies for document_access table
CREATE POLICY "Document owners can manage access" ON document_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM documents WHERE id = document_access.document_id AND uploaded_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Additional policies for document_tags table
CREATE POLICY "Users can view tags of accessible documents" ON document_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d WHERE d.id = document_tags.document_id AND (
        d.is_public = true OR
        d.uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM document_access WHERE document_id = d.id AND user_id = auth.uid() AND can_view = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

CREATE POLICY "Users can manage tags on own documents" ON document_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d WHERE d.id = document_tags.document_id AND (
        d.uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM document_access WHERE document_id = d.id AND user_id = auth.uid() AND can_edit = true) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      )
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at on document_categories
CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on document_requests
CREATE TRIGGER update_document_requests_updated_at BEFORE UPDATE ON document_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment document version when creating a new version
CREATE OR REPLACE FUNCTION auto_increment_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version_number IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO NEW.version_number
    FROM document_versions WHERE document_id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_increment_document_version BEFORE INSERT ON document_versions
  FOR EACH ROW EXECUTE FUNCTION auto_increment_version();

-- Function to create notification when document request is fulfilled
CREATE OR REPLACE FUNCTION notify_document_request_fulfilled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'fulfilled' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.employee_id,
      'Document Request Fulfilled',
      'Your request for "' || NEW.title || '" has been fulfilled.',
      'document_request',
      '/documents?request=' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_on_document_request_fulfilled AFTER UPDATE ON document_requests
  FOR EACH ROW EXECUTE FUNCTION notify_document_request_fulfilled();

-- =============================================
-- STORAGE BUCKET CONFIGURATION
-- =============================================
-- Note: Run this in Supabase SQL Editor after bucket is created in Storage UI

-- Create storage bucket (if not exists via UI)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('documents', 'documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
-- Users can upload to their own folder
CREATE POLICY "Users can upload documents to their folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view files they have access to
CREATE POLICY "Users can view accessible documents in storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND (
      -- Own files
      (storage.foldername(name))[1] = auth.uid()::text OR
      -- Public files
      EXISTS (
        SELECT 1 FROM documents d 
        WHERE d.file_url LIKE '%' || objects.name || '%' 
        AND d.is_public = true
      ) OR
      -- Files with explicit access
      EXISTS (
        SELECT 1 FROM documents d
        JOIN document_access da ON d.id = da.document_id
        WHERE d.file_url LIKE '%' || objects.name || '%'
        AND da.user_id = auth.uid()
        AND da.can_view = true
      ) OR
      -- Admin access
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );

-- Users can update their own files
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files or admins can delete any
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    )
  );
