
GRANT USAGE ON SCHEMA public TO authenticated, anon;

DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
  ) THEN
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
      LANGUAGE SQL STABLE AS $inner$ SELECT NULL::UUID $inner$;
  END IF;
END
$outer$;