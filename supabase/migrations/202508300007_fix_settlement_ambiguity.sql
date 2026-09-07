-- Fix PL/pgSQL output-column ambiguity in jp_apply_settlement.
-- RETURNS TABLE defines entry_id/outcome/settlement_version as variables, so
-- every table-column reference in settlement SQL is explicitly qualified.

CREATE OR REPLACE FUNCTION public.jp_apply_settlement(
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
  FROM public.entries AS e
  WHERE e.entry_id = p_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NOT NULL AND v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF v_status IN ('settled','void','refunded') THEN
    SELECT sr.outcome
      INTO v_existing_outcome
    FROM public.settlement_runs AS sr
    WHERE sr.entry_id = p_entry_id
      AND sr.idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN QUERY
        SELECT p_entry_id, v_existing_outcome, false, true, 0::BIGINT, v_version;
      RETURN;
    ELSE
      RAISE EXCEPTION 'SETTLEMENT_ALREADY_APPLIED' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_expected_version IS NOT NULL AND p_expected_version <> v_version THEN
    RAISE EXCEPTION 'SETTLEMENT_CONFLICT' USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO public.settlement_runs
    (entry_id, idempotency_key, outcome, reward_credits_cents, settlement_version)
  VALUES
    (p_entry_id, p_idempotency_key, p_outcome, COALESCE(p_reward_credits,0), v_version + 1);

  IF p_picks IS NOT NULL AND jsonb_typeof(p_picks) = 'array' THEN
    FOR v_pick IN SELECT jsonb_array_elements(p_picks) LOOP
      v_proj_id := NULLIF(v_pick->>'projectionId','')::UUID;
      v_oc := upper(COALESCE(v_pick->>'outcome',''));
      v_actual := NULLIF(v_pick->>'actualValue','')::NUMERIC;

      UPDATE public.entry_picks AS ep
      SET outcome = v_oc
      WHERE ep.entry_id = p_entry_id
        AND ep.projection_id = v_proj_id;
    END LOOP;
  END IF;

  v_new_version := v_version + 1;

  IF p_outcome = 'WIN' AND COALESCE(p_reward_credits,0) > 0 THEN
    SELECT w.balance_cents
      INTO v_balance
    FROM public.wallets AS w
    WHERE w.user_id = v_owner
      AND w.wallet_kind = 'play'
    FOR UPDATE;

    v_balance := COALESCE(v_balance,0) + COALESCE(p_reward_credits,0);

    UPDATE public.wallets AS w
    SET balance_cents = v_balance,
        updated_at = now()
    WHERE w.user_id = v_owner
      AND w.wallet_kind = 'play';

    INSERT INTO public.wallet_transactions
      (wallet_id, user_id, type, amount_cents, balance_after_cents, entry_id, idempotency_key)
    SELECT w.wallet_id,
           v_owner,
           'ENTRY_WIN',
           COALESCE(p_reward_credits,0),
           v_balance,
           p_entry_id,
           p_idempotency_key
    FROM public.wallets AS w
    WHERE w.user_id = v_owner
      AND w.wallet_kind = 'play';

    v_credited := true;
    v_reward := COALESCE(p_reward_credits,0);

  ELSIF p_outcome IN ('PUSH','VOID') THEN
    SELECT w.balance_cents
      INTO v_balance
    FROM public.wallets AS w
    WHERE w.user_id = v_owner
      AND w.wallet_kind = 'play'
    FOR UPDATE;

    v_balance := COALESCE(v_balance,0) + v_amount;

    UPDATE public.wallets AS w
    SET balance_cents = v_balance,
        updated_at = now()
    WHERE w.user_id = v_owner
      AND w.wallet_kind = 'play';

    INSERT INTO public.wallet_transactions
      (wallet_id, user_id, type, amount_cents, balance_after_cents, entry_id, idempotency_key)
    SELECT w.wallet_id,
           v_owner,
           'ENTRY_REFUND',
           v_amount,
           v_balance,
           p_entry_id,
           p_idempotency_key
    FROM public.wallets AS w
    WHERE w.user_id = v_owner
      AND w.wallet_kind = 'play';

    v_credited := true;
  ELSE
    v_credited := false;
  END IF;

  UPDATE public.entries AS e
  SET status = 'settled',
      settlement_version = v_new_version
  WHERE e.entry_id = p_entry_id;

  RETURN QUERY
    SELECT p_entry_id,
           p_outcome,
           v_credited,
           false,
           v_reward,
           v_new_version;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.jp_apply_settlement(UUID, TEXT, JSONB, BIGINT, TEXT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jp_apply_settlement(UUID, TEXT, JSONB, BIGINT, TEXT, INT)
  TO service_role;
