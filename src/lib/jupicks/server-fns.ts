// JU PICKS - Batch 4 Server Functions
// Database operations and business logic
// REAL_MONEY_ENABLED=false - Virtual credits only

import { getServerSession } from '../auth/dev-auth';

export async function ensureProfile(userId) {
  return {
    id: userId,
    email: 'user@example.com',
    role: 'user',
    walletId: 'wallet_' + userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getVirtualBalance(userId) {
  return 10000;
}

export async function placeEntry(params) {
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

export async function cancelEntry(entryId, userId) {
  return true;
}

export async function getMyEntries(userId, filter) {
  return [];
}

export async function getMyEntry(entryId, userId) {
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

export async function getLedger(userId) {
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

async function jp_place_entry(params) {
  return true;
}

async function jp_cancel_entry(params) {
  return true;
}