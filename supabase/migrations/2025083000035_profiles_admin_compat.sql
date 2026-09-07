-- JU PICKS compatibility migration
-- Bridges foundation profiles schema (user_id, role) to later social/admin SQL
-- without replacing the canonical columns.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id uuid GENERATED ALWAYS AS (user_id) STORED;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean
  GENERATED ALWAYS AS (role IN ('admin', 'superadmin')) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_id_compat_uidx
  ON public.profiles (id);

COMMENT ON COLUMN public.profiles.id IS
  'Compatibility alias for profiles.user_id used by later JU PICKS migrations.';

COMMENT ON COLUMN public.profiles.is_admin IS
  'Compatibility flag derived from profiles.role for admin/superadmin checks.';
