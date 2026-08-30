/**
 * JU PICKS — Typed wrappers for authoritative jp_* RPCs
 * Matches supabase/migrations/202508300002_jp_rpcs.sql
 *
 * Ownership: auth.uid() inside functions. Callers must not pass
 * arbitrary userId from the browser as authority.
 */

import { getDbClient, type QueryResult } from "./client";
import { z } from "zod";

export const BalanceRowSchema = z.object({
  balance_cents: z.coerce.number().int().nonnegative(),
  currency: z.string().optional(),
  updated_at: z.string().optional().nullable(),
});

export const LedgerRowSchema = z.object({
  id: z.string(),
  type: z.string(),
  amount_cents: z.coerce.number().int(),
  balance_after_cents: z.coerce.number().int().nonnegative(),
  entry_id: z.string().uuid().nullable().optional(),
  reason: z.string().nullable().optional(),
  created_at: z.string(),
  idempotency_key: z.string().nullable().optional(),
});

export const PlaceEntryResultSchema = z.object({
  entry_id: z.string().uuid(),
  status: z.string(),
  entry_amount_cents: z.coerce.number().int().positive(),
  power_mode: z.boolean(),
  created_at: z.string(),
  picks: z.unknown().optional(),
});

export const GrantStartingResultSchema = z.object({
  granted: z.boolean(),
  balance_cents: z.coerce.number().int().nonnegative(),
  updated_at: z.string().optional().nullable(),
});

export const RefundResultSchema = z.object({
  refunded: z.boolean(),
  balance_cents: z.coerce.number().int().nonnegative(),
  updated_at: z.string().optional().nullable(),
});

export const ApplySettlementResultSchema = z.object({
  already_settled: z.boolean(),
  credited: z.boolean(),
  entry_id: z.string().uuid(),
  outcome: z.string(),
  reward_credits_cents: z.coerce.number().int().nonnegative().nullable().optional(),
  settlement_version: z.coerce.number().int().nonnegative(),
});

function firstRow<T>(result: QueryResult<T>): T {
  if (!result.rows.length) {
    throw new Error("NOT_FOUND");
  }
  return result.rows[0];
}

/**
 * Optional: validate JWT and set transaction-local marker.
 * Prefer auth.uid() inside RPCs. See docs/SESSION_SAFETY.md.
 */
export async function jpSetSession() {
  const db = getDbClient();
  const result = await db.rpc("jp_set_session", {});
  return firstRow(result);
}

export async function jpGetVirtualBalance() {
  const db = getDbClient();
  const result = await db.rpc("jp_get_virtual_balance", {});
  return BalanceRowSchema.parse(firstRow(result));
}

export async function jpGetLedger(limit = 50, offset = 0) {
  const db = getDbClient();
  const result = await db.rpc("jp_get_ledger", {
    p_limit: limit,
    p_offset: offset,
  });
  return result.rows.map((r) => LedgerRowSchema.parse(r));
}

export async function jpGrantStartingCredit(
  amountCents = 100_000,
  idempotencyKey = "starting-credit-v1",
) {
  const db = getDbClient();
  const result = await db.rpc("jp_grant_starting_credit", {
    p_amount_cents: amountCents,
    p_idempotency_key: idempotencyKey,
  });
  return GrantStartingResultSchema.parse(firstRow(result));
}

export async function jpPlaceEntry(input: {
  contestTypeId: string;
  entryAmountCredits: number;
  picks: Array<{ projectionId: string; direction: "HIGHER" | "LOWER" }>;
  powerMode: boolean;
  idempotencyKey: string;
}) {
  const db = getDbClient();
  const result = await db.rpc("jp_place_entry", {
    p_contest_type_id: input.contestTypeId,
    p_entry_amount: input.entryAmountCredits,
    p_picks: input.picks.map((p) => ({
      projectionId: p.projectionId,
      direction: p.direction,
    })),
    p_power_mode: input.powerMode,
    p_idempotency_key: input.idempotencyKey,
  });
  return PlaceEntryResultSchema.parse(firstRow(result));
}

export async function jpRefundEntry(entryId: string, idempotencyKey: string) {
  const db = getDbClient();
  const result = await db.rpc("jp_refund_entry", {
    p_entry_id: entryId,
    p_idempotency_key: idempotencyKey,
  });
  return RefundResultSchema.parse(firstRow(result));
}

/**
 * Server/service-role only. Never expose to browser.
 */
export async function jpApplySettlement(input: {
  entryId: string;
  outcome: string;
  picks: Array<{
    projectionId: string;
    outcome: string;
    actualValue: number | null;
  }>;
  rewardCredits: number | null;
  idempotencyKey: string;
  expectedVersion?: number | null;
}) {
  const db = getDbClient();
  const result = await db.rpc("jp_apply_settlement", {
    p_entry_id: input.entryId,
    p_outcome: input.outcome,
    p_picks: input.picks.map((p) => ({
      projectionId: p.projectionId,
      outcome: p.outcome,
      actualValue: p.actualValue,
    })),
    p_reward_credits: input.rewardCredits ?? 0,
    p_idempotency_key: input.idempotencyKey,
    p_expected_version: input.expectedVersion ?? null,
  });
  return ApplySettlementResultSchema.parse(firstRow(result));
}
