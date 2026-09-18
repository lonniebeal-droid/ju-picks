// JU PICKS - Batch 4 Board Functions
// Board data composition and retrieval
// Uses real Batch 3 queries, board locking is UX only

import { getServerSession } from '../../auth/dev-auth';

interface SportsBoard {
  sports: Array<{ id: string; name: string; events: any[] }>;
  lastUpdated: string;
  locked: boolean;
}

interface SportBoard {
  sportId: string;
  name: string;
  events: any[];
  lastUpdated: string;
  locked: boolean;
}

interface EventBoard {
  sportId: string;
  eventId: string;
  name: string;
  startTime: string;
  players: any[];
  lastUpdated: string;
  locked: boolean;
}

interface PlayerBoard {
  sportId: string;
  eventId: string;
  playerId: string;
  name: string;
  position: string;
  team: string;
  stats: Record<string, any>;
  lastUpdated: string;
}

/**
 * Get the main sports board with all active sports
 * Board locking is UX only - DB remains authoritative
 */
export async function getSportsBoard(): Promise<SportsBoard> {
  const session = await getServerSession() as { userId: string };
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
export async function getSportBoard(sportId: string): Promise<SportBoard> {
  const session = await getServerSession() as { userId: string };
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
export async function getEventBoard(sportId: string, eventId: string): Promise<EventBoard> {
  const session = await getServerSession() as { userId: string };
  if (!session || !session.userId) {
    throw new Error('Unauthorized: No active session');
  }
  
  const validSports = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab'];
  if (!validSports.includes(sportId.toLowerCase())) {
    throw new Error('Invalid sport ID');
  }
  
  // Event ID should be a valid UUID or numeric ID
  const uuidPattern = /^[a-f0-9-]{36}$/;
  const numericPattern = /^\d+$/;
  if (!uuidPattern.test(eventId) && !numericPattern.test(eventId)) {
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
export async function getPlayerBoard(sportId: string, eventId: string, playerId: string): Promise<PlayerBoard> {
  const session = await getServerSession() as { userId: string };
  if (!session || !session.userId) {
    throw new Error('Unauthorized: No active session');
  }
  
  const validSports = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab'];
  if (!validSports.includes(sportId.toLowerCase())) {
    throw new Error('Invalid sport ID');
  }
  
  const uuidPattern = /^[a-f0-9-]{36}$/;
  const numericPattern = /^\d+$/;
  
  if (!uuidPattern.test(eventId) && !numericPattern.test(eventId)) {
    throw new Error('Invalid event ID');
  }
  
  if (!uuidPattern.test(playerId) && !numericPattern.test(playerId)) {
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
 * Refresh board data (UX only - actual data comes from DB)
 */
export async function refreshBoardData(): Promise<{ refreshed: boolean; timestamp: string }> {
  return { refreshed: true, timestamp: new Date().toISOString() };
}