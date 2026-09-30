-- ==============================================================================
-- Migration: Print Shop OS Capability Routing & Job Configuration Columns
-- ==============================================================================

-- 1. Ensure jobs table has print_config, paper_type, quality, photo_size columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'print_config'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN print_config JSONB DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'paper_type'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN paper_type TEXT DEFAULT 'plain';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'quality'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN quality TEXT DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'photo_size'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN photo_size TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'selected_pages'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN selected_pages JSONB DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'needs_shop_preparation'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN needs_shop_preparation BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Ensure printers table has capabilities, profiles, and stock status columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'printers' AND column_name = 'capabilities'
  ) THEN
    ALTER TABLE public.printers ADD COLUMN capabilities JSONB DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'printers' AND column_name = 'routing_priority'
  ) THEN
    ALTER TABLE public.printers ADD COLUMN routing_priority INT DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'printers' AND column_name = 'routing_enabled'
  ) THEN
    ALTER TABLE public.printers ADD COLUMN routing_enabled BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'printers' AND column_name = 'printer_type'
  ) THEN
    ALTER TABLE public.printers ADD COLUMN printer_type TEXT DEFAULT 'document';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'printers' AND column_name = 'stock_status'
  ) THEN
    ALTER TABLE public.printers ADD COLUMN stock_status TEXT DEFAULT 'available';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'printers' AND column_name = 'media_loaded'
  ) THEN
    ALTER TABLE public.printers ADD COLUMN media_loaded TEXT DEFAULT 'plain';
  END IF;
END $$;

-- 3. Safely expand jobs_print_status_check to allow extended lifecycle values
DO $$
BEGIN
  ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_print_status_check;
  ALTER TABLE public.jobs ADD CONSTRAINT jobs_print_status_check 
    CHECK (print_status IN ('pending_payment', 'queued', 'waiting_for_preparation', 'waiting_for_printer', 'printing', 'completed', 'failed', 'cancelled'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
