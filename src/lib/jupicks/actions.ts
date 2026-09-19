// JU PICKS Batch 4 actions backed by authoritative Supabase RPCs.
import { supabaseGetUser } from '../supabase/client';
import { jpGetVirtualBalance, jpGetLedger, jpPlaceEntry, jpRefundEntry } from '../db/jp-rpc';

export const REAL_MONEY_ENABLED = false as const;

async function requireUser() {
  const user = await supabaseGetUser();
  if (!user?.id) throw new Error('Unauthorized: No active session');
  return user;
}

export async function getVirtualBalanceAction() {
  await requireUser();
  const row = await jpGetVirtualBalance();
  return { success: true, balanceCents: row.balance_cents };
}

export async function getLedgerAction(limit = 50, offset = 0) {
  await requireUser();
  const transactions = await jpGetLedger(limit, offset);
  return { success: true, transactions };
}

export async function placeEntryAction(input: {
  contestTypeId: string;
  entryAmountCredits: number;
  picks: Array<{ projectionId: string; direction: 'HIGHER' | 'LOWER' }>;
  powerMode: boolean;
  idempotencyKey: string;
}) {
  await requireUser();
  if (!input.picks.length) throw new Error('At least one pick is required');
  if (input.entryAmountCredits <= 0) throw new Error('Entry amount must be positive');
  const entry = await jpPlaceEntry(input);
  return { success: true, entry };
}

export async function cancelEntryAction(entryId: string, idempotencyKey: string) {
  await requireUser();
  if (!entryId) throw new Error('Entry ID is required');
  const result = await jpRefundEntry(entryId, idempotencyKey);
  return { success: true, cancelled: result.refunded, balanceCents: result.balance_cents };
}
