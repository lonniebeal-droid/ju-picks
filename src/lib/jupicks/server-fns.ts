/**
 * JU PICKS Batch 4 - Server Functions
 * Server-authoritative functions that derive userId from verified server session only.
 * REAL_MONEY_ENABLED=false - Virtual credits only, no cash value.
 */

import { supabaseGetUser } from '../supabase/client';
import { jpGetVirtualBalance, jpGetLedger, jpPlaceEntry, jpRefundEntry, jpGetMyEntries, jpGetMyEntry } from '../db/jp-rpc';
import type { Entry, LedgerEntry, Wallet } from '../types';

export const REAL_MONEY_ENABLED = false as const;

// Server-authoritative user derivation - NEVER from browser input
async function requireServerUser() {
  const user = await supabaseGetUser();
  if (!user || !user.id) {
    throw new Error('UNAUTHORIZED: No authenticated user session');
  }
  return user;
}

// Ensure user profile exists (server-side only)
export async function ensureProfile(): Promise<{ id: string; username: string; role: string }> {
  const user = await requireServerUser();
  return {
    id: user.id,
    username: user.email || user.id,
    role: user.role || 'user'
  };
}

// Get virtual balance (server-authoritative)
export async function getVirtualBalance(): Promise<{ balance_cents: number; walletId: string }> {
  const user = await requireServerUser();
  const balance = await jpGetVirtualBalance(user.id);
  return {
    balance_cents: balance.balance_cents,
    walletId: balance.wallet_id
  };
}

// Get ledger (server-authoritative)
export async function getLedger(limit: number = 50): Promise<LedgerEntry[]> {
  const user = await requireServerUser();
  return await jpGetLedger(user.id, limit);
}

// Place entry (server-authoritative, forces play wallet)
export async function placeEntry(entryData: {
  sport: string;
  eventId: string;
  playerId: string;
  pickDirection: 'HIGHER' | 'LOWER';
  stake_cents: number;
  entryType: 'FLEX' | 'POWER';
}): Promise<Entry> {
  const user = await requireServerUser();
  const betDirection = entryData.pickDirection === 'HIGHER' ? 'over' : 'under';
  const result = await jpPlaceEntry({
    userId: user.id,
    sport: entryData.sport,
    eventId: entryData.eventId,
    playerId: entryData.playerId,
    betDirection,
    stake_cents: entryData.stake_cents,
    entryType: entryData.entryType,
    walletKind: 'PLAY'
  });
  return result;
}

// Cancel entry (server-authoritative)
export async function cancelEntry(entryId: string): Promise<{ success: boolean; message: string }> {
  const user = await requireServerUser();
  const result = await jpRefundEntry(user.id, entryId);
  return {
    success: result.success,
    message: result.message
  };
}

export async function getMyEntries(status?: string): Promise<Entry[]> {
  const user = await requireServerUser();
  return await jpGetMyEntries(user.id, status);
}

export async function getMyEntry(entryId: string): Promise<Entry | null> {
  const user = await requireServerUser();
  return await jpGetMyEntry(user.id, entryId);
}

export async function getSportsBoard() {
  const user = await requireServerUser();
  return { sports: [], games: [] };
}

export async function getSportBoard(sport: string) {
  const user = await requireServerUser();
  return { games: [], players: [] };
}

export async function getEventBoard(eventId: string) {
  const user = await requireServerUser();
  return { event: null, props: [] };
}

export async function getPlayerBoard(playerId: string) {
  const user = await requireServerUser();
  return { player: null, stats: [] };
}