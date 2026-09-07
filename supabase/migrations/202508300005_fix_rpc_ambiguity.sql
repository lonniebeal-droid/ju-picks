-- Fix PL/pgSQL output-column ambiguity in jp_grant_starting_credit.
-- RETURNS TABLE defines updated_at as a PL/pgSQL variable, so wallet columns
-- must be qualified explicitly inside SQL statements.

CREATE OR REPLACE FUNCTION public.jp_grant_starting_credit(
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
  v_user := public.jp_assert_user(p_user_id);

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.wallets (user_id, wallet_kind, balance_cents)
  VALUES (v_user, 'play', 0)
  ON CONFLICT (user_id, wallet_kind) DO NOTHING;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, type, amount_cents, balance_after_cents, idempotency_key)
  SELECT w.wallet_id,
         v_user,
         'STARTING_CREDIT',
         p_amount_cents,
         w.balance_cents + p_amount_cents,
         p_idempotency_key
  FROM public.wallets AS w
  WHERE w.user_id = v_user
    AND w.wallet_kind = 'play'
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING wallet_transactions.balance_after_cents INTO v_balance;

  IF v_balance IS NOT NULL THEN
    UPDATE public.wallets AS w
    SET balance_cents = v_balance,
        starting_credit_granted = true,
        updated_at = now()
    WHERE w.user_id = v_user
      AND w.wallet_kind = 'play';
    v_granted := true;
  ELSE
    SELECT w.balance_cents
    INTO v_balance
    FROM public.wallets AS w
    WHERE w.user_id = v_user
      AND w.wallet_kind = 'play';
  END IF;

  RETURN QUERY
  SELECT v_granted,
         COALESCE(v_balance, 0),
         w.updated_at
  FROM public.wallets AS w
  WHERE w.user_id = v_user
    AND w.wallet_kind = 'play';
END;
$$;

GRANT EXECUTE ON FUNCTION public.jp_grant_starting_credit(BIGINT, TEXT, UUID)
  TO authenticated;
