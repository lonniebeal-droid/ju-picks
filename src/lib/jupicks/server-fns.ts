/**
 * JU PICKS Batch 4 - Server Functions
 * Thin wrappers over authoritative jp_* RPCs / existing select patterns.
 * REAL_MONEY_ENABLED=false - Virtual credits only, no cash value.
 *
 * Contracts match src/lib/db/jp-rpc.ts and app-provider refresh paths.
 * auth.uid() is authority inside RPCs; callers never pass browser userId as authority.
 */

import { supabaseGetUser } from "../supabase/client";
import {
  jpGetVirtualBalance,
  jpGetLedger,
  jpPlaceEntry,
  jpRefundEntry,
} from "../db/jp-rpc";
import type { Entry, LedgerEntry, VirtualBalance } from "../types";

export const REAL_MONEY_ENABLED = false as const;

async function requireServerUser() {
  const user = await supabaseGetUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED: No authenticated user session");
  }
  return user;
}

export async function ensureProfile(): Promise<{
  id: string;
  username: string;
  role: string;
}> {
  const user = await requireServerUser();
  return {
    id: user.id,
    username: user.email || user.id,
    role: "user",
  };
}

export async function getVirtualBalance(): Promise<VirtualBalance> {
  await requireServerUser();
  const balance = await jpGetVirtualBalance();
  return {
    balance_cents: balance.balance_cents,
    walletId: "play",
  };
}

export async function getLedger(limit: number = 50): Promise<LedgerEntry[]> {
  await requireServerUser();
  const rows = await jpGetLedger(limit, 0);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amountCents: r.amount_cents,
    balanceAfterCents: r.balance_after_cents,
    entryId: r.entry_id ?? null,
    reason: r.reason ?? null,
    idempotencyKey: r.idempotency_key ?? null,
    createdAt: r.created_at,
  }));
}

export async function placeEntry(input: {
  contestTypeId: string;
  entryAmountCredits: number;
  picks: Array<{ projectionId: string; direction: "HIGHER" | "LOWER" }>;
  powerMode: boolean;
  idempotencyKey: string;
}): Promise<{ entryId: string; status: string; entryAmountCents: number; powerMode: boolean; createdAt: string }> {
  await requireServerUser();
  const result = await jpPlaceEntry({
    contestTypeId: input.contestTypeId,
    entryAmountCredits: input.entryAmountCredits,
    picks: input.picks,
    powerMode: input.powerMode,
    idempotencyKey: input.idempotencyKey,
  });
  return {
    entryId: result.entry_id,
    status: result.status,
    entryAmountCents: result.entry_amount_cents,
    powerMode: result.power_mode,
    createdAt: result.created_at,
  };
}

export async function cancelEntry(
  entryId: string,
  idempotencyKey: string,
): Promise<{ success: boolean; message: string; balance_cents: number }> {
  await requireServerUser();
  const result = await jpRefundEntry(entryId, idempotencyKey);
  return {
    success: result.refunded,
    message: result.refunded ? "Entry refunded" : "Entry not open or already refunded",
    balance_cents: result.balance_cents,
  };
}

/**
 * List owned entries via table select (same pattern as app-provider refreshEntries).
 * No jp_get_my_entries RPC exists; do not invent one.
 */
export async function getMyEntries(status?: string): Promise<Entry[]> {
  await requireServerUser();
  const { browserSelect } = await import("../supabase/db-adapter");
  const filters: Record<string, string> = {};
  if (status) filters.status = "eq." + status;
  const result = await browserSelect<{
    entry_id: string;
    status: string;
    power_mode: boolean;
    entry_amount_cents: string | number;
    created_at: string;
  }>("entries", "entry_id,status,power_mode,entry_amount_cents,created_at", filters);

  const full: Entry[] = [];
  for (const row of result.rows) {
    const picksResult = await browserSelect<{
      projection_id: string;
      direction: string;
      locked_line: string | number;
    }>("entry_picks", "projection_id,direction,locked_line", {
      entry_id: "eq." + row.entry_id,
    });
    full.push({
      entryId: row.entry_id,
      status: row.status as Entry["status"],
      mode: row.power_mode ? "POWER" : "FLEX",
      entryAmountCents:
        typeof row.entry_amount_cents === "number"
          ? row.entry_amount_cents
          : parseInt(String(row.entry_amount_cents), 10),
      powerMode: row.power_mode,
      createdAt: row.created_at,
      picks: picksResult.rows.map((p) => ({
        projectionId: p.projection_id,
        direction: p.direction as "HIGHER" | "LOWER",
        playerName: null,
        statType: null,
        line: null,
        lockedLine:
          typeof p.locked_line === "number"
            ? p.locked_line
            : parseFloat(String(p.locked_line)),
        outcome: null,
        actualValue: null,
      })),
      outcome: null,
      rewardCreditsCents: null,
      settlementVersion: 0,
    });
  }
  return full;
}

export async function getMyEntry(entryId: string): Promise<Entry | null> {
  const entries = await getMyEntries();
  return entries.find((e) => e.entryId === entryId) ?? null;
}

export async function getSportsBoard() {
  await requireServerUser();
  return { sports: [] as string[], games: [] as unknown[] };
}

export async function getSportBoard(_sport: string) {
  await requireServerUser();
  return { games: [] as unknown[], players: [] as unknown[] };
}

export async function getEventBoard(_eventId: string) {
  await requireServerUser();
  return { event: null, props: [] as unknown[] };
}

export async function getPlayerBoard(_playerId: string) {
  await requireServerUser();
  return { player: null, stats: [] as unknown[] };
}
