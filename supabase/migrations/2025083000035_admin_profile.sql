-- Ensure admin role flag exists before JU social/admin policies are created.
-- This migration intentionally sorts between 003_persistence_hardening and 004_ju_social.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
