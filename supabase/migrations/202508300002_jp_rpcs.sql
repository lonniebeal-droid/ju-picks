-- JU PICKS — Authoritative RPCs + settlement schema extensions
-- Virtual credits only. REAL_MONEY_ENABLED=false at application layer.
-- Identity: auth.uid() (JWT) for browser calls; service_role / DB owner bypasses
-- for server/admin. No browser-supplied userId authority: when auth.uid() is set,
-- p_user_id MUST match it. Matches scripts/db-integration.mjs contract exactly.

-- =====================================================================
-- Settlement audit (idempotent). UNIQUE(entry_id, idempotency_key) prevents
-- double financial settlement. Service/admin managed.
-- =====================================================================
CREATE TABLE IF NOT EXISTS settlement_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(entry_id),
  idempotency_key TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reward_credits_cents BIGINT NOT NULL DEFAULT 0,
  settlement_version INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, idempotency_key)
);
ALTER TABLE settlement_runs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Final projection results (server-managed; readable for research)
-- =====================================================================
CREATE TABLE IF NOT EXISTS projection_results (
  projection_id UUID PRIMARY KEY REFERENCES projections(projection_id),
  actual_value NUMERIC,
  is_final BOOLEAN NOT NULL DEFAULT false,
  is_void BOOLEAN NOT NULL DEFAULT false,
  source_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE projection_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY projection_results_read ON projection_results
  FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- Contest reward configs (readable; server-managed)
-- =====================================================================
CREATE TABLE IF NOT EXISTS contest_reward_configs (
  contest_type_id UUID PRIMARY KEY REFERENCES contest_types(contest_type_id),
  mode TEXT NOT NULL CHECK (mode IN ('POWER','FLEX')),
  win_multiplier NUMERIC CHECK (win_multiplier IS NULL OR win_multiplier > 0),
  flex_rules JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE contest_reward_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY contest_reward_configs_read ON contest_reward_configs
  FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- RLS + grants for reference data (read to authenticated; writes via service)
-- =====================================================================
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE stat_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY sports_read ON sports FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_read ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY players_read ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY events_read ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY projections_read ON projections FOR SELECT TO authenticated USING (true);
CREATE POLICY stat_types_read ON stat_types FOR SELECT TO authenticated USING (true);
CREATE POLICY contest_types_read ON contest_types FOR SELECT TO authenticated USING (true);

GRANT SELECT ON sports, teams, players, events, projections, stat_types,
            contest_types, projection_results, contest_reward_configs
  TO authenticated;
GRANT SELECT ON profiles, wallets, wallet_transactions, entries, entry_picks
  TO authenticated;

CREATE INDEX IF NOT EXISTS idx_entries_user_idem ON entries (user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_projection_results_final ON projection_results (is_final) WHERE is_final;

-- =====================================================================
-- Internal helper: resolve + authorize the acting user id.
-- When auth.uid() is present (browser), p_user_id must equal it.
-- When auth.uid() is NULL (service_role / CI owner), p_user_id is trusted.
-- =====================================================================
CREATE OR REPLACE FUNCTION jp_assert_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_user UUID := p_user_id;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NOT NULL AND v_user IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF v_user IS NULL THEN
    v_user := v_uid;
  END IF;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  RETURN v_user;
END;
$$;

-- =====================================================================
-- jp_ensure_profile: idempotent profile + play wallet creation (signup)
-- =====================================================================
CREATE OR REPLACE FUNCTION jp_ensure_profile(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user UUID;
BEGIN
  v_user := jp_assert_user(p_user_id);
  INSERT INTO profiles (user_id, role) VALUES (v_user, 'user')
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO wallets (user_id, wallet_kind, balance_cents) VALUES (v_user, 'play', 0)
    ON CONFLICT (user_id, wallet_kind) DO NOTHING;
  RETURN v_user;
END;
$$;

-- =====================================================================
-- jp_get_virtual_balance: owned balance read
-- =====================================================================
CREATE OR REPLACE FUNCTION jp_get_virtual_balance(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(balance_cents BIGINT, currency TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user UUID;
BEGIN
  v_user := jp_assert_user(p_user_id);
  RETURN QUERY
    SELECT w.balance_cents, 'JPV'::TEXT, w.updated_at
    FROM wallets w
    WHERE w.user_id = v_user AND w.wallet_kind = 'play';
END;
$$;

-- =====================================================================
-- jp_get_ledger: owned ledger pagination
-- =====================================================================
CREATE OR REPLACE FUNCTION jp_get_ledger(
  p_user_id UUID DEFAULT auth.uid(),
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID, type TEXT, amount_cents BIGINT, balance_after_cents BIGINT,
  entry_id UUID, reason TEXT, created_at TIMESTAMPTZ, idempotency_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user UUID;
BEGIN
  v_user := jp_assert_user(p_user_id);
  p_limit := LEAST(GREATEST(COALESCE(p_limit,50), 1), 200);
  p_offset := GREATEST(COALESCE(p_offset,0), 0);
  RETURN QUERY
    SELECT t.id, t.type, t.amount_cents, t.balance_after_cents,
           t.entry_id, t.reason, t.created_at, t.idempotency_key
    FROM wallet_transactions t
    WHERE t.user_id = v_user
    ORDER BY t.created_at DESC, t.id DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- =====================================================================
-- jp_grant_starting_credit: once-per-(user,key), idempotent
-- =====================================================================
CREATE OR REPLACE FUNCTION jp_grant_starting_credit(
  p_amount_cents BIGINT,
  p_idempotency_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(granted BOOLEAN, balance_cents BIGINT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_balance BIGINT;
  v_granted BOOLEAN := false;
BEGIN
  v_user := jp_assert_user(p_user_id);
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = '23514';
  END IF;
  INSERT INTO wallets (user_id, wallet_kind, balance_cents) VALUES (v_user, 'play', 0)
    ON CONFLICT (user_id, wallet_kind) DO NOTHING;

  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount_cents, balance_after_cents, idempotency_key)
  SELECT w.wallet_id, v_user, 'STARTING_CREDIT', p_amount_cents, w.balance_cents + p_amount_cents, p_idempotency_key
  FROM wallets w WHERE w.user_id = v_user AND w.wallet_kind = 'play'
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING balance_after_cents INTO v_balance;

  IF v_balance IS NOT NULL THEN
    UPDATE wallets
      SET balance_cents = v_balance, starting_credit_granted = true, updated_at = now()
      WHERE user_id = v_user AND wallet_kind = 'play';
    v_granted := true;
  ELSE
    SELECT balance_cents INTO v_balance
      FROM wallets WHERE user_id = v_user AND wallet_kind = 'play';
  END IF;

  RETURN QUERY SELECT v_granted, COALESCE(v_balance, 0),
    (SELECT updated_at FROM wallets WHERE user_id = v_user AND wallet_kind = 'play');
END;
$$;

-- =====================================================================
-- jp_place_entry: atomic stake + entry + locked picks. Idempotent.
-- =====================================================================
CREATE OR REPLACE FUNCTION jp_place_entry(
  p_contest_type_id UUID,
  p_entry_amount BIGINT,
  p_picks JSONB,
  p_power_mode BOOLEAN,
  p_idempotency_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(entry_id UUID, status TEXT, entry_amount_cents BIGINT, power_mode BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_balance BIGINT;
  v_entry_id UUID;
  v_count INT;
  v_pick JSONB;
  v_proj_id UUID;
  v_dir TEXT;
  v_line NUMERIC;
  v_status TEXT;
  v_h BOOLEAN;
  v_l BOOLEAN;
  v_proj_ids UUID[] := ARRAY[]::UUID[];
  v_dirs TEXT[] := ARRAY[]::TEXT[];
  v_lines NUMERIC[] := ARRAY[]::NUMERIC[];
  v_seen TEXT[] := ARRAY[]::TEXT[];
  i INT;
BEGIN
  v_user := jp_assert_user(p_user_id);

  IF p_entry_amount IS NULL OR p_entry_amount <= 0 OR p_entry_amount > 1000000 THEN
    RAISE EXCEPTION 'INVALID_ENTRY' USING ERRCODE = '23514';
  END IF;
  IF p_picks IS NULL OR jsonb_typeof(p_picks) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ENTRY' USING ERRCODE = '23514';
  END IF;
  v_count := jsonb_array_length(p_picks);
  IF v_count < 1 OR v_count > 20 THEN
    RAISE EXCEPTION 'INVALID_ENTRY' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM contest_types c WHERE c.contest_type_id = p_contest_type_id AND c.active = true) THEN
    RAISE EXCEPTION 'INVALID_ENTRY' USING ERRCODE = '23514';
  END IF;

  INSERT INTO wallets (user_id, wallet_kind, balance_cents) VALUES (v_user, 'play', 0)
    ON CONFLICT (user_id, wallet_kind) DO NOTHING;

  SELECT e.entry_id INTO v_entry_id
    FROM entries e
    WHERE e.user_id = v_user AND e.idempotency_key = p_idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    RETURN QUERY
      SELECT e.entry_id, e.status, e.entry_amount_cents, e.power_mode, e.created_at
      FROM entries e WHERE e.entry_id = v_entry_id;
    RETURN;
  END IF;

  FOR v_pick IN SELECT jsonb_array_elements(p_picks) LOOP
    v_proj_id := NULLIF(v_pick->>'projectionId','')::UUID;
    v_dir := upper(COALESCE(v_pick->>'direction',''));
    IF v_dir = 'OVER' THEN v_dir := 'HIGHER'; END IF;
    IF v_dir = 'UNDER' THEN v_dir := 'LOWER'; END IF;
    IF v_dir NOT IN ('HIGHER','LOWER') THEN
      RAISE EXCEPTION 'INVALID_ENTRY' USING ERRCODE = '23514';
    END IF;
    IF v_proj_id IS NULL THEN
      RAISE EXCEPTION 'PROJECTION_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    IF v_proj_id::TEXT = ANY(v_seen) THEN
      RAISE EXCEPTION 'DUPLICATE_PICK' USING ERRCODE = '23505';
    END IF;
    v_seen := array_append(v_seen, v_proj_id::TEXT);

    SELECT pr.line, pr.status, pr.higher_open, pr.lower_open
      INTO v_line, v_status, v_h, v_l
    FROM projections pr WHERE pr.projection_id = v_proj_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PROJECTION_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    IF v_status <> 'open' THEN
      RAISE EXCEPTION 'PROJECTION_LOCKED' USING ERRCODE = '55006';
    END IF;
    IF v_dir = 'HIGHER' AND NOT v_h THEN
      RAISE EXCEPTION 'PROJECTION_LOCKED' USING ERRCODE = '55006';
    END IF;
    IF v_dir = 'LOWER' AND NOT v_l THEN
      RAISE EXCEPTION 'PROJECTION_LOCKED' USING ERRCODE = '55006';
    END IF;

    v_proj_ids := array_append(v_proj_ids, v_proj_id);
    v_dirs := array_append(v_dirs, v_dir);
    v_lines := array_append(v_lines, v_line);
  END LOOP;

  SELECT w.balance_cents INTO v_balance
    FROM wallets w WHERE w.user_id = v_user AND w.wallet_kind = 'play'
    FOR UPDATE;
  IF v_balance IS NULL THEN v_balance := 0; END IF;
  IF v_balance < p_entry_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING ERRCODE = 'P0003';
  END IF;

  v_entry_id := gen_random_uuid();
  INSERT INTO entries (entry_id, user_id, contest_type_id, entry_amount_cents, power_mode, status, idempotency_key)
    VALUES (v_entry_id, v_user, p_contest_type_id, p_entry_amount, COALESCE(p_power_mode,false), 'open', p_idempotency_key);

  FOR i IN 1..array_length(v_proj_ids,1) LOOP
    INSERT INTO entry_picks (entry_id, projection_id, direction, locked_line)
      VALUES (v_entry_id, v_proj_ids[i], v_dirs[i], v_lines[i]);
  END LOOP;

  v_balance := v_balance - p_entry_amount;
  UPDATE wallets SET balance_cents = v_balance, updated_at = now()
    WHERE user_id = v_user AND wallet_kind = 'play';
  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount_cents, balance_after_cents, entry_id, idempotency_key)
    SELECT w.wallet_id, v_user, 'ENTRY_STAKE', -p_entry_amount, v_balance, v_entry_id, p_idempotency_key
    FROM wallets w WHERE w.user_id = v_user AND w.wallet_kind = 'play';

  RETURN QUERY
    SELECT v_entry_id, 'open'::TEXT, p_entry_amount, COALESCE(p_power_mode,false),
           (SELECT created_at FROM entries WHERE entry_id = v_entry_id);
END;
$$;

-- =====================================================================
-- jp_refund_entry: idempotent refund of an open entry's stake
-- =====================================================================
CREATE OR REPLACE FUNCTION jp_refund_entry(
  p_entry_id UUID,
  p_idempotency_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(refunded BOOLEAN, balance_cents BIGINT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_owner UUID;
  v_status TEXT;
  v_amount BIGINT;
  v_balance BIGINT;
  v_refunded BOOLEAN := false;
BEGIN
  v_user := jp_assert_user(p_user_id);
  SELECT e.user_id, e.status, e.entry_amount_cents
    INTO v_owner, v_status, v_amount
  FROM entries e WHERE e.entry_id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF v_status = 'open' THEN
    SELECT w.balance_cents INTO v_balance
      FROM wallets w WHERE w.user_id = v_user AND w.wallet_kind = 'play' FOR UPDATE;
    v_balance := COALESCE(v_balance,0) + v_amount;
    UPDATE wallets SET balance_cents = v_balance, updated_at = now()
      WHERE user_id = v_user AND wallet_kind = 'play';
    INSERT INTO wallet_transactions (wallet_id, user_id, type, amount_cents, balance_after_cents, entry_id, idempotency_key)
      SELECT w.wallet_id, v_user, 'ENTRY_REFUND', v_amount, v_balance, p_entry_id, p_idempotency_key
      FROM wallets w WHERE w.user_id = v_user AND w.wallet_kind = 'play';
    UPDATE entries SET status = 'refunded' WHERE entry_id = p_entry_id;
    UPDATE entry_picks SET outcome = 'VOID' WHERE entry_id = p_entry_id;
    v_refunded := true;
  ELSE
    SELECT w.balance_cents INTO v_balance
      FROM wallets w WHERE w.user_id = v_user AND w.wallet_kind = 'play';
  END IF;

  RETURN QUERY SELECT v_refunded, COALESCE(v_balance,0), now();
END;
$$;

-- =====================================================================
-- jp_apply_settlement: atomic settle + win credit / push-void refund.
-- Server/service_role ONLY. Not granted to anon/authenticated.
-- Idempotent on (entry_id, idempotency_key); rejects re-settlement with a
-- different key via SETTLEMENT_ALREADY_APPLIED.
-- =====================================================================
CREATE OR REPLACE FUNCTION jp_apply_settlement(
  p_entry_id UUID,
  p_outcome TEXT,
  p_picks JSONB,
  p_reward_credits BIGINT,
  p_idempotency_key TEXT,
  p_expected_version INT DEFAULT 0
)
RETURNS TABLE(
  entry_id UUID, outcome TEXT, credited BOOLEAN, already_settled BOOLEAN,
  reward_credits_cents BIGINT, settlement_version INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_status TEXT;
  v_amount BIGINT;
  v_version INT;
  v_pick JSONB;
  v_proj_id UUID;
  v_oc TEXT;
  v_actual NUMERIC;
  v_balance BIGINT;
  v_credited BOOLEAN := false;
  v_reward BIGINT := 0;
  v_new_version INT;
  v_existing_outcome TEXT;
BEGIN
  SELECT e.user_id, e.status, e.entry_amount_cents, e.settlement_version
    INTO v_owner, v_status, v_amount, v_version
  FROM entries e WHERE e.entry_id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NOT NULL AND v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF v_status IN ('settled','void','refunded') THEN
    SELECT sr.outcome INTO v_existing_outcome
      FROM settlement_runs sr
      WHERE sr.entry_id = p_entry_id AND sr.idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN QUERY SELECT p_entry_id, v_existing_outcome, false, true, 0, v_version;
      RETURN;
    ELSE
      RAISE EXCEPTION 'SETTLEMENT_ALREADY_APPLIED' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_expected_version IS NOT NULL AND p_expected_version <> v_version THEN
    RAISE EXCEPTION 'SETTLEMENT_CONFLICT' USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO settlement_runs (entry_id, idempotency_key, outcome, reward_credits_cents, settlement_version)
    VALUES (p_entry_id, p_idempotency_key, p_outcome, COALESCE(p_reward_credits,0), v_version + 1);

  IF p_picks IS NOT NULL AND jsonb_typeof(p_picks) = 'array' THEN
    FOR v_pick IN SELECT jsonb_array_elements(p_picks) LOOP
      v_proj_id := NULLIF(v_pick->>'projectionId','')::UUID;
      v_oc := upper(COALESCE(v_pick->>'outcome',''));
      v_actual := NULLIF(v_pick->>'actualValue','')::NUMERIC;
      UPDATE entry_picks SET outcome = v_oc
        WHERE entry_id = p_entry_id AND projection_id = v_proj_id;
    END LOOP;
  END IF;

  v_new_version := v_version + 1;

  IF p_outcome = 'WIN' AND COALESCE(p_reward_credits,0) > 0 THEN
    SELECT w.balance_cents INTO v_balance
      FROM wallets w WHERE w.user_id = v_owner AND w.wallet_kind = 'play' FOR UPDATE;
    v_balance := COALESCE(v_balance,0) + COALESCE(p_reward_credits,0);
    UPDATE wallets SET balance_cents = v_balance, updated_at = now()
      WHERE user_id = v_owner AND wallet_kind = 'play';
    INSERT INTO wallet_transactions (wallet_id, user_id, type, amount_cents, balance_after_cents, entry_id, idempotency_key)
      SELECT w.wallet_id, v_owner, 'ENTRY_WIN', COALESCE(p_reward_credits,0), v_balance, p_entry_id, p_idempotency_key
      FROM wallets w WHERE w.user_id = v_owner AND w.wallet_kind = 'play';
    v_credited := true;
    v_reward := COALESCE(p_reward_credits,0);
  ELSIF p_outcome IN ('PUSH','VOID') THEN
    SELECT w.balance_cents INTO v_balance
      FROM wallets w WHERE w.user_id = v_owner AND w.wallet_kind = 'play' FOR UPDATE;
    v_balance := COALESCE(v_balance,0) + v_amount;
    UPDATE wallets SET balance_cents = v_balance, updated_at = now()
      WHERE user_id = v_owner AND wallet_kind = 'play';
    INSERT INTO wallet_transactions (wallet_id, user_id, type, amount_cents, balance_after_cents, entry_id, idempotency_key)
      SELECT w.wallet_id, v_owner, 'ENTRY_REFUND', v_amount, v_balance, p_entry_id, p_idempotency_key
      FROM wallets w WHERE w.user_id = v_owner AND w.wallet_kind = 'play';
    v_credited := true;
  ELSE
    v_credited := false;
  END IF;

  UPDATE entries SET status = 'settled', settlement_version = v_new_version
    WHERE entry_id = p_entry_id;

  RETURN QUERY SELECT p_entry_id, p_outcome, v_credited, false, v_reward, v_new_version;
END;
$$;

-- Grants: public RPCs to authenticated. jp_apply_settlement is NOT granted
-- (server/service_role only; DB owner can still execute).
GRANT EXECUTE ON FUNCTION jp_ensure_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION jp_get_virtual_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION jp_get_ledger(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION jp_grant_starting_credit(BIGINT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION jp_place_entry(UUID, BIGINT, JSONB, BOOLEAN, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION jp_refund_entry(UUID, TEXT, UUID) TO authenticated;