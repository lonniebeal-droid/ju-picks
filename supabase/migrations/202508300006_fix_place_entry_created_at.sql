-- Fix PL/pgSQL output-column ambiguity in jp_place_entry.
-- RETURNS TABLE defines created_at as a PL/pgSQL variable, so the entries
-- column must be explicitly qualified in the RETURN QUERY.

CREATE OR REPLACE FUNCTION public.jp_place_entry(
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
  v_user := public.jp_assert_user(p_user_id);

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

  IF NOT EXISTS (
    SELECT 1
    FROM public.contest_types AS c
    WHERE c.contest_type_id = p_contest_type_id
      AND c.active = true
  ) THEN
    RAISE EXCEPTION 'INVALID_ENTRY' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.wallets (user_id, wallet_kind, balance_cents)
  VALUES (v_user, 'play', 0)
  ON CONFLICT (user_id, wallet_kind) DO NOTHING;

  SELECT e.entry_id
  INTO v_entry_id
  FROM public.entries AS e
  WHERE e.user_id = v_user
    AND e.idempotency_key = p_idempotency_key;

  IF v_entry_id IS NOT NULL THEN
    RETURN QUERY
      SELECT e.entry_id, e.status, e.entry_amount_cents, e.power_mode, e.created_at
      FROM public.entries AS e
      WHERE e.entry_id = v_entry_id;
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
    FROM public.projections AS pr
    WHERE pr.projection_id = v_proj_id
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

  SELECT w.balance_cents
  INTO v_balance
  FROM public.wallets AS w
  WHERE w.user_id = v_user
    AND w.wallet_kind = 'play'
  FOR UPDATE;

  IF v_balance IS NULL THEN v_balance := 0; END IF;
  IF v_balance < p_entry_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING ERRCODE = 'P0003';
  END IF;

  v_entry_id := gen_random_uuid();
  INSERT INTO public.entries
    (entry_id, user_id, contest_type_id, entry_amount_cents, power_mode, status, idempotency_key)
  VALUES
    (v_entry_id, v_user, p_contest_type_id, p_entry_amount, COALESCE(p_power_mode,false), 'open', p_idempotency_key);

  FOR i IN 1..array_length(v_proj_ids,1) LOOP
    INSERT INTO public.entry_picks (entry_id, projection_id, direction, locked_line)
    VALUES (v_entry_id, v_proj_ids[i], v_dirs[i], v_lines[i]);
  END LOOP;

  v_balance := v_balance - p_entry_amount;
  UPDATE public.wallets AS w
  SET balance_cents = v_balance,
      updated_at = now()
  WHERE w.user_id = v_user
    AND w.wallet_kind = 'play';

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, type, amount_cents, balance_after_cents, entry_id, idempotency_key)
  SELECT w.wallet_id,
         v_user,
         'ENTRY_STAKE',
         -p_entry_amount,
         v_balance,
         v_entry_id,
         p_idempotency_key
  FROM public.wallets AS w
  WHERE w.user_id = v_user
    AND w.wallet_kind = 'play';

  RETURN QUERY
    SELECT v_entry_id,
           'open'::TEXT,
           p_entry_amount,
           COALESCE(p_power_mode,false),
           e.created_at
    FROM public.entries AS e
    WHERE e.entry_id = v_entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jp_place_entry(UUID, BIGINT, JSONB, BOOLEAN, TEXT, UUID)
  TO authenticated;
