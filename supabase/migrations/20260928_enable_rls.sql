-- ==============================================================================
-- Migration: Enable Row Level Security (RLS) on all public tables
-- Fixes Supabase Advisor Security Issue: "Policy Exists RLS Disabled"
-- ==============================================================================

-- 1. Enable RLS on all public tables flagged by Supabase Security Advisor
ALTER TABLE IF EXISTS public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;

-- 2. Fix Security Definer View warning on public.job_queue_position
-- Enforces the querying user's RLS policies instead of the view creator's permissions
ALTER VIEW IF EXISTS public.job_queue_position SET (security_invoker = true);

-- 3. Ensure essential permissive policies for public / kiosk web app / counter app operations

-- SHOPS: Anyone can read shops (for customer kiosk by QR code or slug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shops' AND policyname = 'Public can view shops'
  ) THEN
    CREATE POLICY "Public can view shops" ON public.shops FOR SELECT USING (true);
  END IF;
END $$;

-- PRINTERS: Anyone can read printers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'printers' AND policyname = 'Public can view printers'
  ) THEN
    CREATE POLICY "Public can view printers" ON public.printers FOR SELECT USING (true);
  END IF;
END $$;

-- JOBS: Anyone can insert jobs (customer uploads order from kiosk)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'jobs' AND policyname = 'Anyone can insert jobs'
  ) THEN
    CREATE POLICY "Anyone can insert jobs" ON public.jobs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- JOBS: Anyone can view jobs (customers check token status and counter app reads queue)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'jobs' AND policyname = 'Anyone can read jobs'
  ) THEN
    CREATE POLICY "Anyone can read jobs" ON public.jobs FOR SELECT USING (true);
  END IF;
END $$;

-- JOBS: Anyone can update jobs (customer payment confirmation or counter app print status updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'jobs' AND policyname = 'Anyone can update jobs'
  ) THEN
    CREATE POLICY "Anyone can update jobs" ON public.jobs FOR UPDATE USING (true);
  END IF;
END $$;

-- OWNERS: Authenticated owner or signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'owners' AND policyname = 'Anyone can create owner'
  ) THEN
    CREATE POLICY "Anyone can create owner" ON public.owners FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'owners' AND policyname = 'Users can manage own owner profile'
  ) THEN
    CREATE POLICY "Users can manage own owner profile" ON public.owners FOR ALL USING (auth.uid() = id);
  END IF;
END $$;

-- SUBSCRIPTIONS: Owner read/manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Anyone can read subscriptions'
  ) THEN
    CREATE POLICY "Anyone can read subscriptions" ON public.subscriptions FOR SELECT USING (true);
  END IF;
END $$;
