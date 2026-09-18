// JU PICKS - Batch 4 Server Actions
// Server-authoritative actions for JU PICKS platform
// REAL_MONEY_ENABLED=false - Virtual credits only

import { getServerSession } from '../../auth/dev-auth';
import { ensureProfile, getVirtualBalance, placeEntry, cancelEntry, getMyEntries, getMyEntry, getLedger } from './server-fns';

// Constants
export const REAL_MONEY_ENABLED = false;

// Types
interface Session {
  userId: string;
  email?: string;
  role?: string;
}

interface Profile {
  id: string;
  email: string;
  role: string;
  walletId: string;
  createdAt: string;
  updatedAt: string;
}

interface EntryData {
  sportId: string;
  eventId: string;
  playerId: string;
  pickSide: 'HIGHER' | 'LOWER';
  amountCents: number;
}

interface ActionResult<T> {
  success: boolean;
  error?: string;
  profile?: Profile;
  balanceCents?: number;
  entry?: any;
  entries?: any[];
  transactions?: any[];
  cancelled?: boolean;
}

/**
 * Server action to ensure user profile exists
 * Derives userId from verified server session only
 */
export async function ensureProfileAction(): Promise<ActionResult<Profile>> {
  try {
    const session = await getServerSession() as Session;
    if (!session || !session.userId) {
      return { success: false, error: 'Unauthorized: No active session' };
    }
    const profile = await ensureProfile(session.userId);
    return { success: true, profile };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to ensure profile' };
  }
}

/**
 * Server action to get user virtual balance
 * Server-authoritative - never trust browser input
 */
export async function getVirtualBalanceAction(): Promise<ActionResult<number>> {
  try {
    const session = await getServerSession() as Session;
    if (!session || !session.userId) {
      return { success: false, balanceCents: 0, error: 'Unauthorized: No active session' };
    }
    const balanceCents = await getVirtualBalance(session.userId);
    return { success: true, balanceCents };
  } catch (error) {
    return { success: false, balanceCents: 0, error: error instanceof Error ? error.message : 'Failed to get balance' };
  }
}

/**
 * Server action to place an entry (pick)
 * Forces play wallet, calls jp_place_entry
 * Server-authoritative userId derivation
 */
export async function placeEntryAction(entryData: EntryData): Promise<ActionResult<any>> {
  try {
    const session = await getServerSession() as Session;
    if (!session || !session.userId) {
      return { success: false, entry: null, error: 'Unauthorized: No active session' };
    }
    if (!['HIGHER', 'LOWER'].includes(entryData.pickSide)) {
      return { success: false, entry: null, error: 'Invalid pick side' };
    }
    // Map UI pick side to database values
    const dbPickSide = entryData.pickSide === 'HIGHER' ? 'over' : 'under';
    const entry = await placeEntry({
      userId: session.userId,
      sportId: entryData.sportId,
      eventId: entryData.eventId,
      playerId: entryData.playerId,
      pickSide: dbPickSide,
      amountCents: entryData.amountCents
    });
    return { success: true, entry };
  } catch (error) {
    return { success: false, entry: null, error: error instanceof Error ? error.message : 'Failed to place entry' };
  }
}

/**
 * Server action to cancel an entry
 * Calls jp_cancel_entry
 */
export async function cancelEntryAction(entryId: string): Promise<ActionResult<boolean>> {
  try {
    const session = await getServerSession() as Session;
    if (!session || !session.userId) {
      return { success: false, cancelled: false, error: 'Unauthorized: No active session' };
    }
    const cancelled = await cancelEntry(entryId, session.userId);
    return { success: true, cancelled };
  } catch (error) {
    return { success: false, cancelled: false, error: error instanceof Error ? error.message : 'Failed to cancel entry' };
  }
}

/**
 * Server action to get user entries
 */
export async function getMyEntriesAction(filter?: { status?: string; limit?: number }): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession() as Session;
    if (!session || !session.userId) {
      return { success: false, entries: [], error: 'Unauthorized: No active session' };
    }
    const entries = await getMyEntries(session.userId, filter);
    return { success: true, entries };
  } catch (error) {
    return { success: false, entries: [], error: error instanceof Error ? error.message : 'Failed to get entries' };
  }
}

/**
 * Server action to get a specific entry
 */
export async function getMyEntryAction(entryId: string): Promise<ActionResult<any>> {
  try {
    const session = await getServerSession() as Session;
    if (!session || !session.userId) {
      return { success: false, entry: null, error: 'Unauthorized: No active session' };
    }
    const entry = await getMyEntry(entryId, session.userId);
    return { success: true, entry };
  } catch (error) {
    return { success: false, entry: null, error: error instanceof Error ? error.message : 'Failed to get entry' };
  }
}

/**
 * Server action to get user ledger
 */
export async function getLedgerAction(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession() as Session;
    if (!session || !session.userId) {
      return { success: false, transactions: [], error: 'Unauthorized: No active session' };
    }
    const transactions = await getLedger(session.userId);
    return { success: true, transactions };
  } catch (error) {
    return { success: false, transactions: [], error: error instanceof Error ? error.message : 'Failed to get ledger' };
  }
}