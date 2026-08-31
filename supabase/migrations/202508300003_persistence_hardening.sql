-- JU PICKS — Persistence hardening
-- Indexes, session safety helper, stricter grants.
-- Identity remains auth.uid() from JWT. No connection-scoped identity GUC.

CREATE OR REPLACE FUNCTION jp_set_session()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('jupicks.uid', uid::text, true);
  RETURN uid;
END;
$$;

COMMENT ON FUNCTION jp_set_session IS
  'Validates auth.uid() and sets transaction-local jupicks.uid. Not connection-scoped. Prefer auth.uid() in RPCs.';

GRANT EXECUTE ON FUNCTION jp_set_session TO authenticated;

CREATE INDEX IF NOT EXISTS idx_wallets_user_kind
  ON wallets (user_id, wallet_kind);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created
  ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_entry
  ON wallet_transactions (entry_id)
  WHERE entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entries_user_status
  ON entries (user_id, status);

CREATE INDEX IF NOT EXISTS idx_entries_status_settlement
  ON entries (status, settlement_version)
  WHERE status IN ('open', 'locked');

CREATE INDEX IF NOT EXISTS idx_entry_picks_entry
  ON entry_picks (entry_id);

CREATE INDEX IF NOT EXISTS idx_entry_picks_projection
  ON entry_picks (projection_id);

CREATE INDEX IF NOT EXISTS idx_settlement_runs_entry
  ON settlement_runs (entry_id);

CREATE INDEX IF NOT EXISTS idx_projections_status
  ON projections (status)
  WHERE status = 'open';

COMMENT ON TABLE settlement_runs IS
  'Idempotent settlement audit. UNIQUE(entry_id, idempotency_key) prevents double financial settlement.';

COMMENT ON FUNCTION jp_apply_settlement IS
  'Server/service_role only. Locks entry, writes outcomes, credits ENTRY_WIN or refunds PUSH/VOID at most once.';

COMMENT ON FUNCTION jp_place_entry IS
  'Atomic play-wallet debit + entry + locked picks. Idempotent on (user_id, idempotency_key).';
