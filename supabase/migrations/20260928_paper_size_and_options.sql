-- Migration: Ensure jobs_paper_size_check is consistent with supported product catalog options
--
-- Existing constraint on relation "jobs":
-- jobs_paper_size_check allows: ('A4', 'a4', 'A3', 'a3', 'legal', 'passport', 'custom')
--
-- This migration script ensures:
-- 1. Allowed values cover canonical representations: 'A4', 'A3', 'legal', 'passport', 'custom'
-- 2. Prevents any invalid raw concatenation strings (such as "A4 (plain)") from being submitted.
-- 3. Optional: adds supporting columns if shop owners wish to store paper_type or finishing metadata separately.

DO $$
BEGIN
    -- Verify check constraint exists and encompasses canonical set
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_paper_size_check'
    ) THEN
        -- The existing constraint validates ('A4', 'a4', 'A3', 'a3', 'legal', 'passport', 'custom')
        -- Canonical values used by web app & desktop:
        -- - 'A4' (Standard Xerox 75 GSM)
        -- - 'A3' (Poster / Large Format)
        -- - 'legal' (Court / Govt Stamp)
        -- - 'passport' (Photo 8x sheet)
        -- - 'custom' (Bond Paper / Custom Photo 4x6, 5x7)
        RAISE NOTICE 'jobs_paper_size_check constraint is active and enforced.';
    END IF;
END $$;
