// JU PICKS - Batch 4 Board Functions
// Board data composition and retrieval using real Batch 3 sports provider queries.
// Board locking is UX only; DB remains authoritative.

import { supabaseGetUser } from '../supabase/client';
import { getSportsProvider } from '../sports/provider-registry';
import type { Player, PlayerProp, Team } from '../sports/types';

interface SportsBoard {
  sports: Array<{ id: string; name: string; code: string; events: BoardEventSummary[] }>;
  lastUpdated: string;
  locked: boolean;
  isSynthetic: boolean;
  providerId: string;
}

interface BoardEventSummary {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  startsAt: string;
  status: string;
  openPropsCount: number;
}

interface SportBoard {
  sportId: string;
  name: string;
  code: string;
  events: BoardEventDetail[];
  lastUpdated: string;
  locked: boolean;
  isSynthetic: boolean;
}

interface BoardEventDetail {
  id: string;
  homeTeam: { id: string; name: string; abbreviation: string; city: string } | null;
  awayTeam: { id: string; name: string; abbreviation: string; city: string } | null;
  startsAt: string;
  status: string;
  props: Array<{
    id: string;
    playerId: string;
    playerName: string;
    position: string;
    statType: string;
    line: number;
    higherAvailable: boolean;
    lowerAvailable: boolean;
    status: string;
  }>;
}

interface EventBoard {
  sportId: string;
  eventId: string;
  name: string;
  startTime: string;
  status: string;
  homeTeam: { id: string; name: string; abbreviation: string; city: string } | null;
  awayTeam: { id: string; name: string; abbreviation: string; city: string } | null;
  players: BoardPlayerRow[];
  lastUpdated: string;
  locked: boolean;
  isSynthetic: boolean;
}

interface BoardPlayerRow {
  playerId: string;
  name: string;
  position: string;
  teamId: string;
  props: Array<{ id: string; statType: string; line: number; status: string }>;
}

interface PlayerBoard {
  sportId: string;
  eventId: string;
  playerId: string;
  name: string;
  position: string;
  team: string;
  teamId: string;
  stats: Array<{ gameId: string; statType: string; value: number; sourceUpdatedAt: string }>;
  openProps: Array<{ id: string; gameId: string; statType: string; line: number; status: string }>;
  lastUpdated: string;
  isSynthetic: boolean;
}

const VALID_SPORT_CODES = new Set(['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB']);

async function requireUser() {
  const user = await supabaseGetUser();
  if (!user?.id) throw new Error('Unauthorized: No active session');
  return user;
}

function teamLookup(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.id, t]));
}

function playerLookup(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]));
}

function str(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Get the main sports board with all active sports and open events.
 * Uses real Batch 3 StaticDemoProvider (or configured provider).
 */
export async function getSportsBoard(): Promise<SportsBoard> {
  await requireUser();
  const provider = getSportsProvider();

  const [sportsRes, gamesRes, propsRes] = await Promise.all([
    provider.getSports(),
    provider.getGames({ status: 'scheduled' }),
    provider.getPlayerProps(),
  ]);

  const sports = sportsRes.data;
  const games = gamesRes.data;
  const props = propsRes.data;

  const openPropsByGame = new Map<string, number>();
  for (const p of props) {
    if (p.status === 'open') {
      openPropsByGame.set(p.gameId, (openPropsByGame.get(p.gameId) ?? 0) + 1);
    }
  }

  const boardSports = sports.map((sport) => {
    const sportGames = games.filter((g) =>
      g.leagueId.toLowerCase().includes(sport.code.toLowerCase()),
    );
    return {
      id: sport.id,
      name: sport.name,
      code: sport.code,
      events: sportGames.map((g) => ({
        id: g.id,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        startsAt: g.startsAt,
        status: g.status,
        openPropsCount: openPropsByGame.get(g.id) ?? 0,
      })),
    };
  });

  return {
    sports: boardSports,
    lastUpdated: new Date().toISOString(),
    locked: false,
    isSynthetic: provider.isSynthetic,
    providerId: provider.id,
  };
}

/**
 * Get a specific sport board with events and open props.
 */
export async function getSportBoard(sportIdOrCode: string): Promise<SportBoard> {
  await requireUser();
  const provider = getSportsProvider();

  const sportsRes = await provider.getSports();
  const code = sportIdOrCode.toUpperCase();
  const sport =
    sportsRes.data.find((s) => s.id === sportIdOrCode || s.code === code) ??
    null;

  if (!sport && !VALID_SPORT_CODES.has(code)) {
    throw new Error('Invalid sport ID or code');
  }

  const resolvedCode = sport?.code ?? code;
  const resolvedName = sport?.name ?? resolvedCode;
  const resolvedId = sport?.id ?? `s-${resolvedCode.toLowerCase()}`;

  const [gamesRes, teamsRes, playersRes, propsRes] = await Promise.all([
    provider.getGames({ status: 'scheduled' }),
    provider.getTeams(),
    provider.getPlayers(),
    provider.getPlayerProps(),
  ]);

  const teams = teamLookup(teamsRes.data);
  const players = playerLookup(playersRes.data);
  const games = gamesRes.data.filter((g) =>
    g.leagueId.toLowerCase().includes(resolvedCode.toLowerCase()),
  );
  const props = propsRes.data;

  const events: BoardEventDetail[] = games.map((g) => {
    const home = teams.get(g.homeTeamId) ?? null;
    const away = teams.get(g.awayTeamId) ?? null;
    const eventProps = props
      .filter((p) => p.gameId === g.id && p.status === 'open')
      .map((p) => {
        const pl = players.get(p.playerId);
        return {
          id: p.id,
          playerId: p.playerId,
          playerName: pl?.name ?? p.playerId,
          position: str(pl?.position),
          statType: p.statType,
          line: p.line,
          higherAvailable: p.higherAvailable,
          lowerAvailable: p.lowerAvailable,
          status: p.status,
        };
      });
    return {
      id: g.id,
      homeTeam: home
        ? { id: home.id, name: home.name, abbreviation: home.abbreviation, city: home.city }
        : null,
      awayTeam: away
        ? { id: away.id, name: away.name, abbreviation: away.abbreviation, city: away.city }
        : null,
      startsAt: g.startsAt,
      status: g.status,
      props: eventProps,
    };
  });

  return {
    sportId: resolvedId,
    name: resolvedName,
    code: resolvedCode,
    events,
    lastUpdated: new Date().toISOString(),
    locked: false,
    isSynthetic: provider.isSynthetic,
  };
}

/**
 * Get a specific event board with players and props.
 */
export async function getEventBoard(sportIdOrCode: string, eventId: string): Promise<EventBoard> {
  await requireUser();
  const provider = getSportsProvider();

  if (!eventId || eventId.length < 2) {
    throw new Error('Invalid event ID');
  }

  const [gamesRes, teamsRes, playersRes, propsRes] = await Promise.all([
    provider.getGames(),
    provider.getTeams(),
    provider.getPlayers(),
    provider.getPlayerProps({ gameId: eventId }),
  ]);

  const game = gamesRes.data.find((g) => g.id === eventId);
  if (!game) {
    throw new Error('Event not found');
  }

  const teams = teamLookup(teamsRes.data);
  const players = playerLookup(playersRes.data);
  const home = teams.get(game.homeTeamId) ?? null;
  const away = teams.get(game.awayTeamId) ?? null;

  const propsByPlayer = new Map<string, PlayerProp[]>();
  for (const p of propsRes.data) {
    const list = propsByPlayer.get(p.playerId) ?? [];
    list.push(p);
    propsByPlayer.set(p.playerId, list);
  }

  const playerRows: BoardPlayerRow[] = [];
  for (const [playerId, plist] of propsByPlayer) {
    const pl = players.get(playerId);
    playerRows.push({
      playerId,
      name: pl?.name ?? playerId,
      position: str(pl?.position),
      teamId: str(pl?.teamId),
      props: plist.map((p) => ({
        id: p.id,
        statType: p.statType,
        line: p.line,
        status: p.status,
      })),
    });
  }

  const homeName = home ? `${home.city} ${home.name}` : game.homeTeamId;
  const awayName = away ? `${away.city} ${away.name}` : game.awayTeamId;

  return {
    sportId: sportIdOrCode,
    eventId,
    name: `${awayName} @ ${homeName}`,
    startTime: game.startsAt,
    status: game.status,
    homeTeam: home
      ? { id: home.id, name: home.name, abbreviation: home.abbreviation, city: home.city }
      : null,
    awayTeam: away
      ? { id: away.id, name: away.name, abbreviation: away.abbreviation, city: away.city }
      : null,
    players: playerRows,
    lastUpdated: new Date().toISOString(),
    locked: game.status !== 'scheduled',
    isSynthetic: provider.isSynthetic,
  };
}

/**
 * Get a specific player board with recent stats and open props.
 */
export async function getPlayerBoard(
  sportIdOrCode: string,
  eventId: string,
  playerId: string,
): Promise<PlayerBoard> {
  await requireUser();
  const provider = getSportsProvider();

  if (!playerId || playerId.length < 2) {
    throw new Error('Invalid player ID');
  }

  const [playersRes, teamsRes, statsRes, propsRes] = await Promise.all([
    provider.getPlayers(),
    provider.getTeams(),
    provider.getPlayerStats({ playerId }),
    provider.getPlayerProps({ playerId }),
  ]);

  const player = playersRes.data.find((p) => p.id === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  const teamId = str(player.teamId);
  const team = teamsRes.data.find((t) => t.id === teamId);
  const openProps = propsRes.data
    .filter((p) => p.status === 'open')
    .map((p) => ({
      id: p.id,
      gameId: p.gameId,
      statType: p.statType,
      line: p.line,
      status: p.status,
    }));

  return {
    sportId: sportIdOrCode,
    eventId,
    playerId,
    name: player.name,
    position: str(player.position),
    team: team ? `${team.city} ${team.name}` : teamId,
    teamId,
    stats: statsRes.data.map((s) => ({
      gameId: s.gameId,
      statType: s.statType,
      value: s.value,
      sourceUpdatedAt: s.sourceUpdatedAt,
    })),
    openProps,
    lastUpdated: new Date().toISOString(),
    isSynthetic: provider.isSynthetic,
  };
}

/**
 * Refresh board data (UX only — actual data comes from provider/DB).
 */
export async function refreshBoardData(): Promise<{ refreshed: boolean; timestamp: string }> {
  return { refreshed: true, timestamp: new Date().toISOString() };
}
