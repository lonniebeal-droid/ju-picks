import { describe, it, expect } from "vitest";
import {
  WalletError,
  mapWalletDbError,
  WALLET_SAFE_MESSAGES,
} from "~/lib/wallet/errors";
import {
  EntryError,
  ENTRY_SAFE_MESSAGES,
  mapEntryError,
} from "~/lib/entries/errors";
import {
  SettlementError,
  SETTLEMENT_SAFE_MESSAGES,
  mapSettlementError,
} from "~/lib/settlement/errors";

describe("wallet safe errors", () => {
  it("maps insufficient credits", () => {
    expect(mapWalletDbError(new Error("insufficient_credits")).code).toBe(
      "INSUFFICIENT_CREDITS",
    );
  });
  it("maps duplicate", () => {
    expect(mapWalletDbError(new Error("duplicate idempotency")).code).toBe(
      "DUPLICATE_TRANSACTION",
    );
  });
  it("maps real money", () => {
    expect(mapWalletDbError(new Error("real_money disabled")).code).toBe(
      "REAL_MONEY_DISABLED",
    );
  });
  it("never leaks arbitrary message in SAFE_MESSAGES", () => {
    for (const code of Object.keys(WALLET_SAFE_MESSAGES) as Array<
      keyof typeof WALLET_SAFE_MESSAGES
    >) {
      expect(WALLET_SAFE_MESSAGES[code]).not.toMatch(/sql|stack|password/i);
    }
  });
  it("preserves WalletError", () => {
    const e = new WalletError("NOT_AUTHORIZED");
    expect(mapWalletDbError(e)).toBe(e);
  });
});

describe("entry safe errors", () => {
  it("maps projection locked", () => {
    expect(mapEntryError(new Error("projection_locked")).code).toBe(
      "PROJECTION_LOCKED",
    );
  });
  it("safe messages have no SQL", () => {
    for (const v of Object.values(ENTRY_SAFE_MESSAGES)) {
      expect(v).not.toMatch(/select |insert |constraint/i);
    }
  });
  it("preserves EntryError", () => {
    const e = new EntryError("DUPLICATE_PICK");
    expect(mapEntryError(e)).toBe(e);
  });
});

describe("settlement safe errors", () => {
  it("maps contest config missing", () => {
    expect(mapSettlementError(new Error("CONTEST_CONFIG_MISSING")).code).toBe(
      "CONTEST_CONFIG_MISSING",
    );
  });
  it("maps already applied", () => {
    expect(mapSettlementError(new Error("already_settled")).code).toBe(
      "SETTLEMENT_ALREADY_APPLIED",
    );
  });
  it("safe messages", () => {
    for (const v of Object.values(SETTLEMENT_SAFE_MESSAGES)) {
      expect(v.length).toBeGreaterThan(0);
      expect(v).not.toMatch(/stack|sql/i);
    }
  });
  it("preserves SettlementError", () => {
    const e = new SettlementError("RESULT_NOT_FINAL");
    expect(mapSettlementError(e)).toBe(e);
  });
});
