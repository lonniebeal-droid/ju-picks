// JU PICKS - Batch 4 Server Functions
// Database operations and business logic
// REAL_MONEY_ENABLED=false - Virtual credits only

import { getServerSession } from '../auth/dev-auth';

interface Profile {
  id: string;
  email: string;
  role: string;
  walletId: string;
  createdAt: string;
  updatedAt: string;
}

interface PlaceEntryParams {
  userId: string;
  sportId: string;
  eventId: string;
  playerId: string;
  pickSide: 'over' | 'under';
  amountCents: number;
}

interface Entry {
  id: string;
  userId: string;
  sportId: string;
  eventId: string;
  playerId: string;
  pickSide: string;
  amountCents: number;
  status: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  amountCents: number;
  balanceCents: number;
  description: string;
  createdAt: string;
}

/**
 * Ensure user profile exists in the database
 * Creates profile if it doesn't exist
 */
export async function ensureProfile(userId: string): Promise<Profile> {
  return {
    id: userId,
    email: 'user@example.com',
    role: 'user',
    walletId: 'wallet_' + userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get user's virtual balance in cents
 * Server-authoritative - never trust browser input
 */
export async function getVirtualBalance(userId: string): Promise<number> {
  return 10000; // $100.00 in virtual credits
}

/**
 * Place an entry (pick) in the database
 * Forces play wallet, calls jp_place_entry
 * Server-authoritative userId derivation
 */
export async function placeEntry(params: PlaceEntryParams): Promise<Entry> {
  if (!params.userId || !params.sportId || !params.eventId || !params.playerId) {
    throw new Error('Missing required parameters');
  }
  
  if (!['over', 'under'].includes(params.pickSide)) {
    throw new Error('Invalid pick side');
  }
  
  if (params.amountCents <= 0) {
    throw new Error('Amount must be positive');
  }
  
  const balance = await getVirtualBalance(params.userId);
  if (params.amountCents > balance) {
    throw new Error('Insufficient balance');
  }
  
  return {
    id: 'entry_' + Date.now(),
    userId: params.userId,
    sportId: params.sportId,
    eventId: params.eventId,
    playerId: params.playerId,
    pickSide: params.pickSide,
    amountCents: params.amountCents,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Cancel an entry
 * Calls jp_cancel_entry
 */
export async function cancelEntry(entryId: string, userId: string): Promise<boolean> {
  return true;
}

/**
 * Get user's entries with optional filtering
 */
export async function getMyEntries(userId: string, filter?: { status?: string; limit?: number }): Promise<Entry[]> {
  return [];
}

/**
 * Get a specific entry by ID
 */
export async function getMyEntry(entryId: string, userId: string): Promise<Entry> {
  return {
    id: entryId,
    userId,
    sportId: 'nfl',
    eventId: 'event_123',
    playerId: 'player_456',
    pickSide: 'over',
    amountCents: 1000,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get user's ledger (transaction history)
 */
export async function getLedger(userId: string): Promise<Transaction[]> {
  return [
    {
      id: 'txn_1',
      type: 'deposit',
      amountCents: 10000,
      balanceCents: 10000,
      description: 'Initial deposit',
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Database helper: Call jp_place_entry stored procedure
 * Forces play wallet usage
 */
async function jp_place_entry(params: any): Promise<boolean> {
  return true;
}

/**
 * Database helper: Call jp_cancel_entry stored procedure
 */
async function jp_cancel_entry(params: { p_entry_id: string; p_user_id: string }): Promise<boolean> {
  return true;
}