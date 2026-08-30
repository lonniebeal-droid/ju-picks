/**
 * JU PICKS — Sports data provider interface
 */

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
} from "./types";

export type ProviderErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_BAD_RESPONSE"
  | "PROVIDER_RATE_LIMITED"
  | "SPORT_NOT_SUPPORTED"
  | "NOT_FOUND"
  | "INTERNAL";

export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ProviderError";
  }
}

export interface SportsDataProvider {
  readonly id: string;
  readonly isSynthetic: boolean;
  getSports(): Promise<WithMeta<Sport[]>>;
  getLeagues(sportCode?: string): Promise<WithMeta<League[]>>;
  getGames(filter?: GamesFilter): Promise<WithMeta<Game[]>>;
  getTeams(filter?: TeamsFilter): Promise<WithMeta<Team[]>>;
  getPlayers(filter?: PlayersFilter): Promise<WithMeta<Player[]>>;
  getPlayerProps(filter?: PlayerPropsFilter): Promise<WithMeta<PlayerProp[]>>;
  getPlayerStats(filter?: PlayerStatsFilter): Promise<WithMeta<PlayerStat[]>>;
  getGameResults(filter?: GameResultsFilter): Promise<WithMeta<GameResult[]>>;
}

export interface CacheEntry<T> {
  value: WithMeta<T>;
  expiresAt: number;
}

export class ProviderCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;
  constructor(defaultTtlMs = 60_000) {
    this.defaultTtlMs = defaultTtlMs;
  }
  get<T>(key: string): WithMeta<T> | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  set<T>(key: string, value: WithMeta<T>, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }
  clear(): void {
    this.store.clear();
  }
}

export async function withCache<T>(
  cache: ProviderCache,
  key: string,
  ttlMs: number,
  fn: () => Promise<WithMeta<T>>,
): Promise<WithMeta<T>> {
  const hit = cache.get<T>(key);
  if (hit) return hit;
  try {
    const result = await fn();
    cache.set(key, result, ttlMs);
    return result;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(
      "PROVIDER_UNAVAILABLE",
      "Sports data temporarily unavailable",
    );
  }
}
