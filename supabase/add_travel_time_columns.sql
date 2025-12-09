-- Add check-in and check-out time columns to travel_requests table
-- This allows tracking of departure and return times for travel requests

ALTER TABLE travel_requests 
  ADD COLUMN IF NOT EXISTS check_out_time TIME,
  ADD COLUMN IF NOT EXISTS check_in_time TIME;

-- Add comments for documentation
COMMENT ON COLUMN travel_requests.check_out_time IS 'Departure time on the start date of travel';
COMMENT ON COLUMN travel_requests.check_in_time IS 'Return/arrival time on the end date of travel';
