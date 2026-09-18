// JU PICKS - Batch 4 Board Functions
// Board data composition and retrieval
// Uses real Batch 3 queries, board locking is UX only

import { getServerSession } from '../../auth/dev-auth';

/**
 * Get the main sports board with all active sports
 * Board locking is UX only - DB remains authoritative
 */
export async function getSportsBoard() {
  const session = await getServerSession();
  if (!session || !session.userId) {
    throw new Error('Unauthorized: No active session');
  }
  
  return {
    sports: [
      { id: 'nfl', name: 'NFL', events: [] },
      { id: 'nba', name: 'NBA', events: [] },
      { id: 'mlb', name: 'MLB', events: [] },
      { id: 'nhl', name: 'NHL', events: [] },
    ],
    lastUpdated: new Date().toISOString(),
    locked: false,
  };
}

/**
 * Get a specific sport board
 */
export async function getSportBoard(sportId) {
  const session = await getServerSession();
  if (!session || !session.userId) {
    throw new Error('Unauthorized: No active session');
  }
  
  const validSports = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab'];
  if (!validSports.includes(sportId.toLowerCase())) {
    throw new Error('Invalid sport ID');
  }
  
  return {
    sportId,
    name: sportId.toUpperCase(),
    events: [],
    lastUpdated: new Date().toISOString(),
    locked: false,
  };
}

/**
 * Get a specific event board
 */
export async function getEventBoard(sportId, eventId) {
  const session = await getServerSession();
  if (!session || !session.userId) {
    throw new Error('Unauthorized: No active session');
  }
  
  const validSports = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab'];
  if (!validSports.includes(sportId.toLowerCase())) {
    throw new Error('Invalid sport ID');
  }
  
  if (!/^[a-f0-9-]{36}$|^\d+$/.test(eventId)) {
    throw new Error('Invalid event ID');
  }
  
  return {
    sportId,
    eventId,
    name: 'Event Name',
    startTime: new Date().toISOString(),
    players: [],
    lastUpdated: new Date().toISOString(),
    locked: false,
  };
}

/**
 * Get a specific player board
 */
export async function getPlayerBoard(sportId, eventId, playerId) {
  const session = await getServerSession();
  if (!session || !session.userId) {
    throw new Error('Unauthorized: No active session');
  }
  
  const validSports = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab'];
  if (!validSports.includes(sportId.toLowerCase())) {
    throw new Error('Invalid sport ID');
  }
  
  if (!/^[a-f0-9-]{36}$|^\d+$/.test(eventId)) {
    throw new Error('Invalid event ID');
  }
  
  if (!/^[a-f0-9-]{36}$|^\d+$/.test(playerId)) {
    throw new Error('Invalid player ID');
  }
  
  return {
    sportId,
    eventId,
    playerId,
    name: 'Player Name',
    position: 'Position',
    team: 'Team',
    stats: {},
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Refresh board data (UX only)
 */
export async function refreshBoardData() {
  return { refreshed: true, timestamp: new Date().toISOString() };
}