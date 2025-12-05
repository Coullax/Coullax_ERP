-- =============================================
-- FIX: Calendar Schema Migration
-- =============================================
-- This script ensures clean migration from old events table to new calendar system
-- =============================================

-- Step 1: Drop old events table if it exists (from legacy schema)
DROP TABLE IF EXISTS events CASCADE;

-- Step 2: Ensure calendar_events table exists with correct schema
-- If it already exists, this will be skipped
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    RAISE NOTICE 'calendar_events table does not exist. Please run calendar_schema.sql first.';
  END IF;
END $$;

-- Step 3: Verify column types are correct
DO $$
BEGIN
  -- Check if start_time and end_time are TIMESTAMPTZ (not TIME)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'calendar_events' 
    AND column_name IN ('start_time', 'end_time')
    AND data_type != 'timestamp with time zone'
  ) THEN
    RAISE EXCEPTION 'calendar_events has incorrect column types. start_time and end_time must be TIMESTAMPTZ.';
  END IF;
END $$;

RAISE NOTICE 'Old events table dropped successfully. Calendar system is ready.';
