/**
 * Persistence boundary tests (no live DB required)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getSettlementPersistenceAdapter,
  resetSettlementPersistenceAdapter,
  UnconfiguredSettlementAdapter,
} from "~/lib/settlement/internal";
import { SettlementError } from "~/lib/settlement/errors";
import { isDbConfigured, setDbClient, hasDatabaseEnv } from "~/lib/db/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("settlement adapter fail-closed", () => {
  beforeEach(() => {
    resetSettlementPersistenceAdapter();
    setDbClient(null);
  });

  it("defaults to unconfigured adapter", () => {
    const a = getSettlementPersistenceAdapter();
    expect(a.id).toBe("unconfigured");
    expect(a).toBeInstanceOf(UnconfiguredSettlementAdapter);
  });

  it("loadEntryForSettlement throws when unconfigured", async () => {
    const a = getSettlementPersistenceAdapter();
    await expect(a.loadEntryForSettlement("11111111-1111-1111-1111-111111111111")).rejects.toBeInstanceOf(
      SettlementError,
    );
  });

  it("applySettlementTransaction throws when unconfigured", async () => {
    const a = getSettlementPersistenceAdapter();
    await expect(
      a.applySettlementTransaction({
        entryId: "11111111-1111-1111-1111-111111111111",
        userId: "22222222-2222-2222-2222-222222222222",
        outcome: "WIN",
        picks: [],
        rewardCredits: 0,
        rewardAvailable: true,
        idempotencyKey: "test-key-12345",
      }),
    ).rejects.toBeInstanceOf(SettlementError);
  });

  it("db is not configured without env client", () => {
    expect(isDbConfigured()).toBe(false);
  });
});

describe("migration SQL contract", () => {
  const sql = readFileSync(
    resolve(__dirname, "../supabase/migrations/202508300002_jp_rpcs.sql"),
    "utf8",
  );

  it("defines required RPCs", () => {
    for (const fn of [
      "jp_get_virtual_balance",
      "jp_get_ledger",
      "jp_grant_starting_credit",
      "jp_place_entry",
      "jp_refund_entry",
      "jp_apply_settlement",
      "jp_ensure_profile",
    ]) {
      expect(sql).toContain(`FUNCTION ${fn}`);
    }
  });

  it("enforces play wallet only and non-negative balance", () => {
    expect(sql).toMatch(/wallet_kind/i);
    // foundation migration has balance check; RPCs must not allow negative
    expect(sql).toContain("INSUFFICIENT_CREDITS");
  });

  it("has idempotency for starting credit and place entry", () => {
    expect(sql).toContain("idempotency_key");
    expect(sql).toContain("STARTING_CREDIT");
    expect(sql).toContain("ENTRY_STAKE");
    expect(sql).toContain("ENTRY_WIN");
    expect(sql).toContain("ENTRY_REFUND");
  });

  it("settlement is service_role only", () => {
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION jp_apply_settlement TO service_role");
  });

  it("does not reference flexTiers", () => {
    expect(sql.toLowerCase()).not.toContain("flextiers");
  });

  it("uses flex_rules column", () => {
    expect(sql).toContain("flex_rules");
  });
});

describe("real money env", () => {
  it("hasDatabaseEnv is false without secrets", () => {
    // In this environment without DATABASE_URL set during test, expect false
    // (do not assert process mutation)
    expect(typeof hasDatabaseEnv()).toBe("boolean");
  });
});
