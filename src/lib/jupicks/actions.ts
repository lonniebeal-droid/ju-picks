// JU PICKS - Batch 4 Server Actions
// Server-authoritative actions for JU PICKS platform
// REAL_MONEY_ENABLED=false - Virtual credits only

import { getServerSession } from '../../auth/dev-auth';
import { ensureProfile, getVirtualBalance, placeEntry, cancelEntry, getMyEntries, getMyEntry, getLedger } from './server-fns';

// Constants
export const REAL_MONEY_ENABLED = false;

export async function ensureProfileAction() {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return { success: false, profile: null, error: 'Unauthorized' };
    }
    const profile = await ensureProfile(session.userId);
    return { success: true, profile };
  } catch (error) {
    return { success: false, profile: null, error: 'Failed' };
  }
}

export async function getVirtualBalanceAction() {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return { success: false, balanceCents: 0, error: 'Unauthorized' };
    }
    const balanceCents = await getVirtualBalance(session.userId);
    return { success: true, balanceCents };
  } catch (error) {
    return { success: false, balanceCents: 0, error: 'Failed' };
  }
}

export async function placeEntryAction(entryData) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return { success: false, entry: null, error: 'Unauthorized' };
    }
    if (!['HIGHER', 'LOWER'].includes(entryData.pickSide)) {
      return { success: false, entry: null, error: 'Invalid pick side' };
    }
    const dbPickSide = entryData.pickSide === 'HIGHER' ? 'over' : 'under';
    const entry = await placeEntry({ userId: session.userId, sportId: entryData.sportId, eventId: entryData.eventId, playerId: entryData.playerId, pickSide: dbPickSide, amountCents: entryData.amountCents });
    return { success: true, entry };
  } catch (error) {
    return { success: false, entry: null, error: 'Failed' };
  }
}

export async function cancelEntryAction(entryId) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return { success: false, cancelled: false, error: 'Unauthorized' };
    }
    const cancelled = await cancelEntry(entryId, session.userId);
    return { success: true, cancelled };
  } catch (error) {
    return { success: false, cancelled: false, error: 'Failed' };
  }
}

export async function getMyEntriesAction(filter) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return { success: false, entries: [], error: 'Unauthorized' };
    }
    const entries = await getMyEntries(session.userId, filter);
    return { success: true, entries };
  } catch (error) {
    return { success: false, entries: [], error: 'Failed' };
  }
}

export async function getMyEntryAction(entryId) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return { success: false, entry: null, error: 'Unauthorized' };
    }
    const entry = await getMyEntry(entryId, session.userId);
    return { success: true, entry };
  } catch (error) {
    return { success: false, entry: null, error: 'Failed' };
  }
}

export async function getLedgerAction() {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return { success: false, transactions: [], error: 'Unauthorized' };
    }
    const transactions = await getLedger(session.userId);
    return { success: true, transactions };
  } catch (error) {
    return { success: false, transactions: [], error: 'Failed' };
  }
}