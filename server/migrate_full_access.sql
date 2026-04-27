-- Migration: Add full_access field to schools table
-- Run this SQL to add full_access to existing schools

ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS full_access BOOLEAN DEFAULT TRUE;

-- Set full_access = TRUE for all existing schools
UPDATE schools SET full_access = TRUE WHERE full_access IS NULL;
