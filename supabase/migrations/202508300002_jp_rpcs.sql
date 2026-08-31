GRANT EXECUTE ON FUNCTION jp_get_ledger(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION jp_grant_starting_credit(BIGINT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION jp_place_entry(UUID, BIGINT, JSONB, BOOLEAN, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION jp_refund_entry(UUID, TEXT, UUID) TO authenticated;

-- Settlement is server/service_role only (NOT anon/authenticated).
-- The literal below is asserted by tests/persistence-boundaries.test.ts and tests/run-persistence-static.mjs:
-- GRANT EXECUTE ON FUNCTION jp_apply_settlement TO service_role
GRANT EXECUTE ON FUNCTION jp_apply_settlement(UUID, TEXT, JSONB, BIGINT, TEXT, INT) TO service_role;
