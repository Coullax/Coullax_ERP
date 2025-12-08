-- =============================================
-- RLS POLICY FIX FOR INFINITE RECURSION
-- =============================================
-- This script fixes the infinite recursion issue in documents RLS policies
-- Run this AFTER applying documents_schema.sql

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view versions of accessible documents" ON document_versions;
DROP POLICY IF EXISTS "Users can add versions to own documents" ON document_versions;
DROP POLICY IF EXISTS "Users can view tags of accessible documents" ON document_tags;
DROP POLICY IF EXISTS "Users can manage tags on own documents" ON document_tags;

-- Recreate simpler policies without recursion

-- Document Versions: Simpler policies without nested document checks
CREATE POLICY "Users can view document versions" ON document_versions
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Users can create document versions" ON document_versions
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Document Tags: Simpler policies
CREATE POLICY "Users can view document tags" ON document_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents WHERE id = document_tags.document_id AND (
      uploaded_by = auth.uid() OR
      is_public = true
    )) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Users can manage document tags" ON document_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM documents WHERE id = document_tags.document_id AND uploaded_by = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Update the main documents SELECT policy to be simpler and avoid recursion
DROP POLICY IF EXISTS "Users can view accessible documents" ON documents;

CREATE POLICY "Users can view accessible documents" ON documents
  FOR SELECT USING (
    is_public = true OR
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM document_access da 
      WHERE da.document_id = documents.id 
      AND da.user_id = auth.uid() 
      AND da.can_view = true
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
