-- Migration: Rename salary_ranges table to apit_ranges
-- This script renames the salary_ranges table and updates all related constraints and indexes

-- Step 1: Rename the table
ALTER TABLE salary_ranges RENAME TO apit_ranges;

-- Step 2: Rename the column in salary_category_rules
ALTER TABLE salary_category_rules RENAME COLUMN salary_range_id TO apit_range_id;

-- Step 3: Rename the indexes
ALTER INDEX idx_salary_ranges_amounts RENAME TO idx_apit_ranges_amounts;

-- Step 4: Rename the trigger
ALTER TRIGGER update_salary_ranges_updated_at ON apit_ranges RENAME TO update_apit_ranges_updated_at;

-- Step 5: Drop old RLS policies
DROP POLICY IF EXISTS "Allow admins to view salary ranges" ON apit_ranges;
DROP POLICY IF EXISTS "Allow admins to insert salary ranges" ON apit_ranges;
DROP POLICY IF EXISTS "Allow admins to update salary ranges" ON apit_ranges;
DROP POLICY IF EXISTS "Allow admins to delete salary ranges" ON apit_ranges;

-- Step 6: Create new RLS policies with updated names
CREATE POLICY "Allow admins to view apit ranges"
  ON apit_ranges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to insert apit ranges"
  ON apit_ranges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to update apit ranges"
  ON apit_ranges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admins to delete apit ranges"
  ON apit_ranges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Note: The foreign key constraint in salary_category_rules will automatically reference
-- the renamed table because it references by OID, not by name. The column has been renamed to apit_range_id.
