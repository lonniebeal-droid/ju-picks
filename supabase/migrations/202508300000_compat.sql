-- JU PICKS — platform compatibility shims (plain Postgres / CI)
-- Supabase already provides auth.uid(), authenticated, anon. This migration
-- creates them ONLY when missing so the migration chain applies on a bare
-- Postgres (CI) and remains a no-op on Supabase.
-- Virtual credits only. REAL_MONEY_ENABLED=false at application layer.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO authenticated, anon;

DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
      LANGUAGE SQL STABLE AS $inner$ SELECT NULL::UUID $inner$;
  END IF;
END
$outer$;
