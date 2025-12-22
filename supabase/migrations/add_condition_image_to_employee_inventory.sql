-- Add condition_image_url column to employee_inventory table
-- This stores the URL of the asset condition image taken at assignment time

ALTER TABLE employee_inventory
ADD COLUMN condition_image_url text;

COMMENT ON COLUMN employee_inventory.condition_image_url IS 'URL of the image showing asset condition at time of assignment';
