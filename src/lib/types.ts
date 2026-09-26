/**
 * JU PICKS — Shared domain types for server-fns / API layer
 * Derived from existing app-provider, entries, and jp-rpc contracts.
 * Do not invent parallel APIs.
 */

export interface LedgerEntry {
  id: string;
  type: string;
  amountCents: number;
  balanceAfterCents: number;
  entryId: string | null;
  reason: string | null;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface EntryPick {
  projectionId: string;
  direction: "HIGHER" | "LOWER";
  playerName: string | null;
  statType: string | null;
  line: number | null;
  lockedLine: number | null;
  outcome: string | null;
  actualValue: number | null;
}

export interface Entry {
  entryId: string;
  status: "open" | "locked" | "settled" | "void" | "cancelled" | "refunded";
  mode: "FLEX" | "POWER";
  entryAmountCents: number;
  powerMode: boolean;
  createdAt: string;
  picks: EntryPick[];
  outcome: string | null;
  rewardCreditsCents: number | null;
  settlementVersion: number;
}

export interface VirtualBalance {
  balance_cents: number;
  walletId: string;
}
