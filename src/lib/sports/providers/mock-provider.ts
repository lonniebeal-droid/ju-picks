/**
 * JU PICKS — Development mock sports provider
 * SYNTHETIC ONLY. Constructor rejects production runtime.
 */

import type { SportsDataProvider } from "../provider";
import { ProviderError, ProviderCache, withCache } from "../provider";
import type {
  Sport,
  League,
  Team,
  Player,
  Game,
  PlayerProp,
  PlayerStat,
  GameResult,
  GamesFilter,
  TeamsFilter,
  PlayersFilter,
  PlayerPropsFilter,
  PlayerStatsFilter,
  GameResultsFilter,
  WithMeta,
  ProviderMeta,
} from "../types";
import {
  SportSchema,
  LeagueSchema,
  TeamSchema,
  PlayerSchema,
  GameSchema,
  PlayerPropSchema,
  PlayerStatSchema,
  GameResultSchema,
  GamesFilterSchema,
  TeamsFilterSchema,
  PlayersFilterSchema,
  PlayerPropsFilterSchema,
  PlayerStatsFilterSchema,
  GameResultsFilterSchema,
} from "../types";

function nowIso(): string {
  return new Date().toISOString();
}

function meta(): ProviderMeta {
  return {
    fetchedAt: nowIso(),
    sourceUpdatedAt: nowIso(),
    providerId: "mock",
    isSynthetic: true,
  };
}

function isProductionRuntime(): boolean {
  return (
    (typeof process !== "undefined" && process.env?.NODE_ENV) || "production"
  ) === "production";
}

function futureIso(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

const SPORTS: Sport[] = [
  { id: "sport-nfl", name: "National Football League", code: "NFL" },
  { id: "sport-nba", name: "National Basketball Association", code: "NBA" },
  { id: "sport-mlb", name: "Major League Baseball", code: "MLB" },
  { id: "sport-nhl", name: "National Hockey League", code: "NHL" },
  { id: "sport-wnba", name: "WNBA", code: "WNBA" },
  { id: "sport-ncaaf", name: "NCAA Football", code: "NCAAF" },
  { id: "sport-ncaab", name: "NCAA Basketball", code: "NCAAB" },
  { id: "sport-soccer", name: "Soccer", code: "SOCCER" },
];

const LEAGUES: League[] = [
  {
    id: "league-nfl-2025",
    sportId: "sport-nfl",
    name: "NFL",
    code: "NFL",
    season: "2025",
  },
  {
    id: "league-nba-2025",
    sportId: "sport-nba",
    name: "NBA",
    code: "NBA",
    season: "2025-26",
  },
];

const TEAMS: Team[] = [
  {
    id: "team-kc",
    leagueId: "league-nfl-2025",
    name: "Chiefs",
    abbreviation: "KC",
    city: "Kansas City",
    logoUrl: null,
  },
  {
    id: "team-buf",
    leagueId: "league-nfl-2025",
    name: "Bills",
    abbreviation: "BUF",
    city: "Buffalo",
    logoUrl: null,
  },
];

const PLAYERS: Player[] = [
  {
    id: "player-mahomes",
    teamId: "team-kc",
    leagueId: "league-nfl-2025",
    name: "Patrick Mahomes",
    position: "QB",
    status: "active",
  },
  {
    id: "player-allen",
    teamId: "team-buf",
    leagueId: "league-nfl-2025",
    name: "Josh Allen",
    position: "QB",
    status: "active",
  },
];

const GAMES: Game[] = [
  {
    id: "game-nfl-1",
    leagueId: "league-nfl-2025",
    homeTeamId: "team-kc",
    awayTeamId: "team-buf",
    startsAt: futureIso(48),
    status: "scheduled",
  },
];

const PROPS: PlayerProp[] = [
  {
    id: "prop-mahomes-pass-yds",
    gameId: "game-nfl-1",
    playerId: "player-mahomes",
    statType: "passing_yards",
    line: 275.5,
    higherAvailable: true,
    lowerAvailable: true,
    status: "open",
    sourceUpdatedAt: nowIso(),
  },
  {
    id: "prop-allen-pass-yds",
    gameId: "game-nfl-1",
    playerId: "player-allen",
    statType: "passing_yards",
    line: 265.5,
    higherAvailable: true,
    lowerAvailable: true,
    status: "open",
    sourceUpdatedAt: nowIso(),
  },
];

export class MockSportsProvider implements SportsDataProvider {
  readonly id = "mock";
  readonly isSynthetic = true;
  private cache = new ProviderCache(30_000);

  constructor() {
    if (isProductionRuntime()) {
      throw new ProviderError(
        "PROVIDER_NOT_CONFIGURED",
        "MockSportsProvider cannot be constructed in production",
      );
    }
  }

  async getSports(): Promise<WithMeta<Sport[]>> {
    return withCache(this.cache, "sports", 60_000, async () => ({
      data: SportSchema.array().parse(SPORTS),
      meta: meta(),
    }));
  }

  async getLeagues(sportCode?: string): Promise<WithMeta<League[]>> {
    return withCache(this.cache, `leagues:${sportCode ?? "all"}`, 60_000, async () => {
      let rows = [...LEAGUES];
      if (sportCode) {
        const sport = SPORTS.find((s) => s.code === sportCode);
        if (!sport) throw new ProviderError("SPORT_NOT_SUPPORTED");
        rows = rows.filter((l) => l.sportId === sport.id);
      }
      return { data: LeagueSchema.array().parse(rows), meta: meta() };
    });
  }

  async getGames(filter?: GamesFilter): Promise<WithMeta<Game[]>> {
    const f = GamesFilterSchema.parse(filter ?? {});
    return withCache(this.cache, `games:${JSON.stringify(f)}`, 30_000, async () => {
      let rows = [...GAMES];
      if (f.leagueId) rows = rows.filter((g) => g.leagueId === f.leagueId);
      if (f.status) rows = rows.filter((g) => g.status === f.status);
      return { data: GameSchema.array().parse(rows), meta: meta() };
    });
  }

  async getTeams(filter?: TeamsFilter): Promise<WithMeta<Team[]>> {
    const f = TeamsFilterSchema.parse(filter ?? {});
    return withCache(this.cache, `teams:${JSON.stringify(f)}`, 60_000, async () => {
      let rows = [...TEAMS];
      if (f.leagueId) rows = rows.filter((t) => t.leagueId === f.leagueId);
      return { data: TeamSchema.array().parse(rows), meta: meta() };
    });
  }

  async getPlayers(filter?: PlayersFilter): Promise<WithMeta<Player[]>> {
    const f = PlayersFilterSchema.parse(filter ?? {});
    return withCache(this.cache, `players:${JSON.stringify(f)}`, 60_000, async () => {
      let rows = [...PLAYERS];
      if (f.leagueId) rows = rows.filter((p) => p.leagueId === f.leagueId);
      if (f.teamId) rows = rows.filter((p) => p.teamId === f.teamId);
      return { data: PlayerSchema.array().parse(rows), meta: meta() };
    });
  }

  async getPlayerProps(
    filter?: PlayerPropsFilter,
  ): Promise<WithMeta<PlayerProp[]>> {
    const f = PlayerPropsFilterSchema.parse(filter ?? {});
    return withCache(this.cache, `props:${JSON.stringify(f)}`, 15_000, async () => {
      let rows = [...PROPS];
      if (f.gameId) rows = rows.filter((p) => p.gameId === f.gameId);
      if (f.playerId) rows = rows.filter((p) => p.playerId === f.playerId);
      return { data: PlayerPropSchema.array().parse(rows), meta: meta() };
    });
  }

  async getPlayerStats(
    filter?: PlayerStatsFilter,
  ): Promise<WithMeta<PlayerStat[]>> {
    PlayerStatsFilterSchema.parse(filter ?? {});
    return {
      data: PlayerStatSchema.array().parse([]),
      meta: meta(),
    };
  }

  async getGameResults(
    filter?: GameResultsFilter,
  ): Promise<WithMeta<GameResult[]>> {
    GameResultsFilterSchema.parse(filter ?? {});
    return {
      data: GameResultSchema.array().parse([]),
      meta: meta(),
    };
  }
}
