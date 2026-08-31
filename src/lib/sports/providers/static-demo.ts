/**
 * JU PICKS — Static demo data provider
 * Production-safe: clearly labeled synthetic data for the free-to-play MVP.
 * No live API keys required. No production rejection.
 *
 * This is NOT live sports data. Lines are illustrative only.
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
} from "../types";

function nowIso(): string {
  return new Date().toISOString();
}

function meta(): ProviderMeta {
  return {
    fetchedAt: nowIso(),
    sourceUpdatedAt: nowIso(),
    providerId: "static-demo",
    isSynthetic: true,
  };
}

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400_000).toISOString();
}

// ─── Sports ──────────────────────────────────────────────
const SPORTS: Sport[] = [
  { id: "s-nfl", name: "NFL Football", code: "NFL" },
  { id: "s-nba", name: "NBA Basketball", code: "NBA" },
  { id: "s-mlb", name: "MLB Baseball", code: "MLB" },
];

// ─── Leagues ─────────────────────────────────────────────
const LEAGUES: League[] = [
  { id: "l-nfl-25", sportId: "s-nfl", name: "NFL 2025", code: "NFL", season: "2025" },
  { id: "l-nba-25", sportId: "s-nba", name: "NBA 2025-26", code: "NBA", season: "2025-26" },
  { id: "l-mlb-25", sportId: "s-mlb", name: "MLB 2025", code: "MLB", season: "2025" },
];

// ─── Teams ────────────────────────────────────────────────
const TEAMS: Team[] = [
  // NFL
  { id: "t-kc", leagueId: "l-nfl-25", name: "Chiefs", abbreviation: "KC", city: "Kansas City", logoUrl: null },
  { id: "t-buf", leagueId: "l-nfl-25", name: "Bills", abbreviation: "BUF", city: "Buffalo", logoUrl: null },
  { id: "t-sf", leagueId: "l-nfl-25", name: "49ers", abbreviation: "SF", city: "San Francisco", logoUrl: null },
  { id: "t-dal", leagueId: "l-nfl-25", name: "Cowboys", abbreviation: "DAL", city: "Dallas", logoUrl: null },
  // NBA
  { id: "t-lal", leagueId: "l-nba-25", name: "Lakers", abbreviation: "LAL", city: "Los Angeles", logoUrl: null },
  { id: "t-bos", leagueId: "l-nba-25", name: "Celtics", abbreviation: "BOS", city: "Boston", logoUrl: null },
  { id: "t-den", leagueId: "l-nba-25", name: "Nuggets", abbreviation: "DEN", city: "Denver", logoUrl: null },
  { id: "t-gsw", leagueId: "l-nba-25", name: "Warriors", abbreviation: "GSW", city: "Golden State", logoUrl: null },
  // MLB
  { id: "t-nyy", leagueId: "l-mlb-25", name: "Yankees", abbreviation: "NYY", city: "New York", logoUrl: null },
  { id: "t-lad", leagueId: "l-mlb-25", name: "Dodgers", abbreviation: "LAD", city: "Los Angeles", logoUrl: null },
];

// ─── Players ─────────────────────────────────────────────
const PLAYERS: Player[] = [
  // NFL
  { id: "p-mahomes", teamId: "t-kc", leagueId: "l-nfl-25", name: "Patrick Mahomes", position: "QB", status: "active" },
  { id: "p-kelce", teamId: "t-kc", leagueId: "l-nfl-25", name: "Travis Kelce", position: "TE", status: "active" },
  { id: "p-allen", teamId: "t-buf", leagueId: "l-nfl-25", name: "Josh Allen", position: "QB", status: "active" },
  { id: "p-diggs", teamId: "t-buf", leagueId: "l-nfl-25", name: "Stefon Diggs", position: "WR", status: "active" },
  { id: "p-cmc", teamId: "t-sf", leagueId: "l-nfl-25", name: "Christian McCaffrey", position: "RB", status: "active" },
  { id: "p-lamb", teamId: "t-dal", leagueId: "l-nfl-25", name: "CeeDee Lamb", position: "WR", status: "active" },
  // NBA
  { id: "p-lebron", teamId: "t-lal", leagueId: "l-nba-25", name: "LeBron James", position: "SF", status: "active" },
  { id: "p-ad", teamId: "t-lal", leagueId: "l-nba-25", name: "Anthony Davis", position: "PF", status: "active" },
  { id: "p-tatum", teamId: "t-bos", leagueId: "l-nba-25", name: "Jayson Tatum", position: "SF", status: "active" },
  { id: "p-jokic", teamId: "t-den", leagueId: "l-nba-25", name: "Nikola Jokic", position: "C", status: "active" },
  { id: "p-curry", teamId: "t-gsw", leagueId: "l-nba-25", name: "Stephen Curry", position: "PG", status: "active" },
  // MLB
  { id: "p-judge", teamId: "t-nyy", leagueId: "l-mlb-25", name: "Aaron Judge", position: "OF", status: "active" },
  { id: "p-ohtani", teamId: "t-lad", leagueId: "l-mlb-25", name: "Shohei Ohtani", position: "DH", status: "active" },
];

// ─── Games ───────────────────────────────────────────────
const GAMES: Game[] = [
  // NFL — upcoming
  { id: "g-nfl-1", leagueId: "l-nfl-25", homeTeamId: "t-kc", awayTeamId: "t-buf", startsAt: hoursFromNow(48), status: "scheduled" },
  { id: "g-nfl-2", leagueId: "l-nfl-25", homeTeamId: "t-sf", awayTeamId: "t-dal", startsAt: hoursFromNow(72), status: "scheduled" },
  // NFL — completed (for settlement demo)
  { id: "g-nfl-0", leagueId: "l-nfl-25", homeTeamId: "t-kc", awayTeamId: "t-dal", startsAt: daysAgo(2), status: "final" },
  // NBA — upcoming
  { id: "g-nba-1", leagueId: "l-nba-25", homeTeamId: "t-lal", awayTeamId: "t-bos", startsAt: hoursFromNow(24), status: "scheduled" },
  { id: "g-nba-2", leagueId: "l-nba-25", homeTeamId: "t-den", awayTeamId: "t-gsw", startsAt: hoursFromNow(30), status: "scheduled" },
  // MLB — upcoming
  { id: "g-mlb-1", leagueId: "l-mlb-25", homeTeamId: "t-nyy", awayTeamId: "t-lad", startsAt: hoursFromNow(6), status: "scheduled" },
];

// ─── Props ───────────────────────────────────────────────
const PROPS: PlayerProp[] = [
  // NFL game 1 (upcoming)
  { id: "pr-nfl1-mahomes-py", gameId: "g-nfl-1", playerId: "p-mahomes", statType: "passing_yards", line: 275.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nfl1-mahomes-td", gameId: "g-nfl-1", playerId: "p-mahomes", statType: "passing_tds", line: 2.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nfl1-kelce-rec", gameId: "g-nfl-1", playerId: "p-kelce", statType: "receiving_yards", line: 65.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nfl1-allen-py", gameId: "g-nfl-1", playerId: "p-allen", statType: "passing_yards", line: 265.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nfl1-allen-ruy", gameId: "g-nfl-1", playerId: "p-allen", statType: "rushing_yards", line: 45.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nfl1-diggs-rec", gameId: "g-nfl-1", playerId: "p-diggs", statType: "receiving_yards", line: 75.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  // NFL game 2 (upcoming)
  { id: "pr-nfl2-cmc-ruy", gameId: "g-nfl-2", playerId: "p-cmc", statType: "rushing_yards", line: 85.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nfl2-lamb-rec", gameId: "g-nfl-2", playerId: "p-lamb", statType: "receiving_yards", line: 90.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  // NBA game 1 (upcoming)
  { id: "pr-nba1-lebron-pts", gameId: "g-nba-1", playerId: "p-lebron", statType: "points", line: 26.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba1-lebron-reb", gameId: "g-nba-1", playerId: "p-lebron", statType: "rebounds", line: 7.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba1-lebron-ast", gameId: "g-nba-1", playerId: "p-lebron", statType: "assists", line: 8.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba1-ad-pts", gameId: "g-nba-1", playerId: "p-ad", statType: "points", line: 24.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba1-ad-reb", gameId: "g-nba-1", playerId: "p-ad", statType: "rebounds", line: 11.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba1-tatum-pts", gameId: "g-nba-1", playerId: "p-tatum", statType: "points", line: 28.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba1-tatum-reb", gameId: "g-nba-1", playerId: "p-tatum", statType: "rebounds", line: 8.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  // NBA game 2 (upcoming)
  { id: "pr-nba2-jokic-pts", gameId: "g-nba-2", playerId: "p-jokic", statType: "points", line: 27.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba2-jokic-ast", gameId: "g-nba-2", playerId: "p-jokic", statType: "assists", line: 9.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba2-jokic-reb", gameId: "g-nba-2", playerId: "p-jokic", statType: "rebounds", line: 12.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba2-curry-pts", gameId: "g-nba-2", playerId: "p-curry", statType: "points", line: 29.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-nba2-curry-3pm", gameId: "g-nba-2", playerId: "p-curry", statType: "three_pointers_made", line: 4.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  // MLB game 1 (upcoming)
  { id: "pr-mlb1-judge-hr", gameId: "g-mlb-1", playerId: "p-judge", statType: "home_runs", line: 0.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-mlb1-judge-rbi", gameId: "g-mlb-1", playerId: "p-judge", statType: "rbis", line: 1.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-mlb1-ohtani-hr", gameId: "g-mlb-1", playerId: "p-ohtani", statType: "home_runs", line: 0.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  { id: "pr-mlb1-ohtani-hits", gameId: "g-mlb-1", playerId: "p-ohtani", statType: "hits", line: 1.5, higherAvailable: true, lowerAvailable: true, status: "open", sourceUpdatedAt: nowIso() },
  // NFL game 0 (completed — for settlement demo)
  { id: "pr-nfl0-mahomes-py", gameId: "g-nfl-0", playerId: "p-mahomes", statType: "passing_yards", line: 280.5, higherAvailable: true, lowerAvailable: true, status: "settled", sourceUpdatedAt: daysAgo(2) },
  { id: "pr-nfl0-kelce-rec", gameId: "g-nfl-0", playerId: "p-kelce", statType: "receiving_yards", line: 70.5, higherAvailable: true, lowerAvailable: true, status: "settled", sourceUpdatedAt: daysAgo(2) },
];

// ─── Player Stats (recent game log for research) ─────────
const PLAYER_STATS: PlayerStat[] = [
  // Mahomes recent games
  { playerId: "p-mahomes", gameId: "g-nfl-0", statType: "passing_yards", value: 312, sourceUpdatedAt: daysAgo(1) },
  { playerId: "p-mahomes", gameId: "g-prev-1", statType: "passing_yards", value: 298, sourceUpdatedAt: daysAgo(8) },
  { playerId: "p-mahomes", gameId: "g-prev-2", statType: "passing_yards", value: 256, sourceUpdatedAt: daysAgo(15) },
  { playerId: "p-mahomes", gameId: "g-prev-3", statType: "passing_yards", value: 341, sourceUpdatedAt: daysAgo(22) },
  { playerId: "p-mahomes", gameId: "g-prev-4", statType: "passing_yards", value: 274, sourceUpdatedAt: daysAgo(29) },
  // Allen recent games
  { playerId: "p-allen", gameId: "g-prev-5", statType: "passing_yards", value: 282, sourceUpdatedAt: daysAgo(7) },
  { playerId: "p-allen", gameId: "g-prev-6", statType: "passing_yards", value: 245, sourceUpdatedAt: daysAgo(14) },
  { playerId: "p-allen", gameId: "g-prev-7", statType: "passing_yards", value: 318, sourceUpdatedAt: daysAgo(21) },
  // LeBron recent games
  { playerId: "p-lebron", gameId: "g-prev-8", statType: "points", value: 28, sourceUpdatedAt: daysAgo(3) },
  { playerId: "p-lebron", gameId: "g-prev-9", statType: "points", value: 24, sourceUpdatedAt: daysAgo(5) },
  { playerId: "p-lebron", gameId: "g-prev-10", statType: "points", value: 31, sourceUpdatedAt: daysAgo(7) },
  { playerId: "p-lebron", gameId: "g-prev-11", statType: "points", value: 26, sourceUpdatedAt: daysAgo(10) },
  { playerId: "p-lebron", gameId: "g-prev-12", statType: "points", value: 22, sourceUpdatedAt: daysAgo(12) },
  // Jokic recent
  { playerId: "p-jokic", gameId: "g-prev-13", statType: "points", value: 29, sourceUpdatedAt: daysAgo(3) },
  { playerId: "p-jokic", gameId: "g-prev-14", statType: "points", value: 25, sourceUpdatedAt: daysAgo(5) },
  { playerId: "p-jokic", gameId: "g-prev-15", statType: "points", value: 33, sourceUpdatedAt: daysAgo(7) },
  // Curry recent
  { playerId: "p-curry", gameId: "g-prev-16", statType: "points", value: 32, sourceUpdatedAt: daysAgo(3) },
  { playerId: "p-curry", gameId: "g-prev-17", statType: "points", value: 27, sourceUpdatedAt: daysAgo(5) },
  { playerId: "p-curry", gameId: "g-prev-18", statType: "three_pointers_made", value: 6, sourceUpdatedAt: daysAgo(3) },
  { playerId: "p-curry", gameId: "g-prev-19", statType: "three_pointers_made", value: 4, sourceUpdatedAt: daysAgo(5) },
  // Judge recent
  { playerId: "p-judge", gameId: "g-prev-20", statType: "home_runs", value: 1, sourceUpdatedAt: daysAgo(1) },
  { playerId: "p-judge", gameId: "g-prev-21", statType: "home_runs", value: 0, sourceUpdatedAt: daysAgo(2) },
  { playerId: "p-judge", gameId: "g-prev-22", statType: "home_runs", value: 2, sourceUpdatedAt: daysAgo(4) },
  // Ohtani recent
  { playerId: "p-ohtani", gameId: "g-prev-23", statType: "home_runs", value: 1, sourceUpdatedAt: daysAgo(1) },
  { playerId: "p-ohtani", gameId: "g-prev-24", statType: "home_runs", value: 1, sourceUpdatedAt: daysAgo(3) },
  { playerId: "p-ohtani", gameId: "g-prev-25", statType: "hits", value: 3, sourceUpdatedAt: daysAgo(1) },
  { playerId: "p-ohtani", gameId: "g-prev-26", statType: "hits", value: 2, sourceUpdatedAt: daysAgo(3) },
];

// ─── Game Results (for settlement) ────────────────────────
const GAME_RESULTS: GameResult[] = [
  { gameId: "g-nfl-0", homeScore: 27, awayScore: 20, status: "final", finalizedAt: daysAgo(1) },
];

export class StaticDemoProvider implements SportsDataProvider {
  readonly id = "static-demo";
  readonly isSynthetic = true;
  private cache = new ProviderCache(60_000);

  async getSports(): Promise<WithMeta<Sport[]>> {
    return withCache(this.cache, "sports", 120_000, async () => ({
      data: SportSchema.array().parse(SPORTS),
      meta: meta(),
    }));
  }

  async getLeagues(sportCode?: string): Promise<WithMeta<League[]>> {
    return withCache(this.cache, "leagues:" + (sportCode ?? "all"), 120_000, async () => {
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
    const f = filter ?? {};
    return withCache(this.cache, "games:" + JSON.stringify(f), 60_000, async () => {
      let rows = [...GAMES];
      if (f.leagueId) rows = rows.filter((g) => g.leagueId === f.leagueId);
      if (f.status) rows = rows.filter((g) => g.status === f.status);
      return { data: GameSchema.array().parse(rows), meta: meta() };
    });
  }

  async getTeams(filter?: TeamsFilter): Promise<WithMeta<Team[]>> {
    const f = filter ?? {};
    return withCache(this.cache, "teams:" + JSON.stringify(f), 120_000, async () => {
      let rows = [...TEAMS];
      if (f.leagueId) rows = rows.filter((t) => t.leagueId === f.leagueId);
      return { data: TeamSchema.array().parse(rows), meta: meta() };
    });
  }

  async getPlayers(filter?: PlayersFilter): Promise<WithMeta<Player[]>> {
    const f = filter ?? {};
    return withCache(this.cache, "players:" + JSON.stringify(f), 120_000, async () => {
      let rows = [...PLAYERS];
      if (f.leagueId) rows = rows.filter((p) => p.leagueId === f.leagueId);
      if (f.teamId) rows = rows.filter((p) => p.teamId === f.teamId);
      return { data: PlayerSchema.array().parse(rows), meta: meta() };
    });
  }

  async getPlayerProps(filter?: PlayerPropsFilter): Promise<WithMeta<PlayerProp[]>> {
    const f = filter ?? {};
    return withCache(this.cache, "props:" + JSON.stringify(f), 30_000, async () => {
      let rows = [...PROPS];
      if (f.gameId) rows = rows.filter((p) => p.gameId === f.gameId);
      if (f.playerId) rows = rows.filter((p) => p.playerId === f.playerId);
      return { data: PlayerPropSchema.array().parse(rows), meta: meta() };
    });
  }

  async getPlayerStats(filter?: PlayerStatsFilter): Promise<WithMeta<PlayerStat[]>> {
    const f = filter ?? {};
    let rows = [...PLAYER_STATS];
    if (f.playerId) rows = rows.filter((s) => s.playerId === f.playerId);
    if (f.gameId) rows = rows.filter((s) => s.gameId === f.gameId);
    return { data: PlayerStatSchema.array().parse(rows), meta: meta() };
  }

  async getGameResults(filter?: GameResultsFilter): Promise<WithMeta<GameResult[]>> {
    const f = filter ?? {};
    let rows = [...GAME_RESULTS];
    if (f.gameId) rows = rows.filter((r) => r.gameId === f.gameId);
    return { data: GameResultSchema.array().parse(rows), meta: meta() };
  }
}
