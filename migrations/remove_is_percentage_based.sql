-- Migration: Remove is_percentage_based column from salary_categories table
-- Created: 2025-12-29

-- Drop the is_percentage_based column from salary_categories table
ALTER TABLE salary_categories 
DROP COLUMN IF EXISTS is_percentage_based;
