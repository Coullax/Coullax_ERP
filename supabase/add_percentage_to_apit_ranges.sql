-- Add percentage column to apit_ranges table
-- This allows storing the APIT tax percentage for each range

ALTER TABLE apit_ranges 
ADD COLUMN percentage NUMERIC(5, 2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100);

COMMENT ON COLUMN apit_ranges.percentage IS 'APIT tax percentage for this range (0-100)';
