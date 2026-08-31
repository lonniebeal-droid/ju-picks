/**
 * JU PICKS — Centralized feature flags / configuration
 * REAL_MONEY_ENABLED is hard-gated to false for the free-to-play MVP.
 * Never enable real-money mode through client-side UI.
 */

export interface FeatureFlags {
  /** Hard gate — must be false for MVP. No cash, deposits, withdrawals. */
  REAL_MONEY_ENABLED: boolean;
  /** Sports data source: "demo" (static) or "live" (provider API). */
  SPORTS_DATA_MODE: "demo" | "live";
  /** Social rooms. */
  ROOMS_ENABLED: boolean;
  /** Friend challenges. */
  CHALLENGES_ENABLED: boolean;
  /** Global / room leaderboards. */
  LEADERBOARDS_ENABLED: boolean;
  /** JU AI EDGE research assistant. */
  AI_EDGE_ENABLED: boolean;
  /** Social: profiles, follows, activity. */
  SOCIAL_ENABLED: boolean;
  /** Admin tools (server-authorized only). */
  ADMIN_ENABLED: boolean;
  /** In-app notifications. */
  NOTIFICATIONS_ENABLED: boolean;
  /** Max picks per entry slip. */
  MAX_PICKS_PER_ENTRY: number;
  /** Max entry amount in virtual credits. */
  MAX_ENTRY_AMOUNT_CREDITS: number;
  /** Starting virtual credits for new users. */
  STARTING_CREDITS: number;
}

function envBool(key: string, fallback: boolean): boolean {
  if (typeof process === "undefined") return fallback;
  const v = process.env?.[key];
  if (v === undefined) return fallback;
  return v === "true";
}

function envStr(key: string, fallback: string): string {
  if (typeof process === "undefined") return fallback;
  return process.env?.[key] ?? fallback;
}

function envInt(key: string, fallback: number): number {
  if (typeof process === "undefined") return fallback;
  const v = process.env?.[key];
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    // HARD GATE — never true for MVP
    REAL_MONEY_ENABLED: false,
    SPORTS_DATA_MODE: envStr("JU_PICKS_SPORTS_DATA_MODE", "demo") as "demo" | "live",
    ROOMS_ENABLED: envBool("JU_PICKS_ROOMS_ENABLED", true),
    CHALLENGES_ENABLED: envBool("JU_PICKS_CHALLENGES_ENABLED", true),
    LEADERBOARDS_ENABLED: envBool("JU_PICKS_LEADERBOARDS_ENABLED", true),
    AI_EDGE_ENABLED: envBool("JU_PICKS_AI_EDGE_ENABLED", true),
    SOCIAL_ENABLED: envBool("JU_PICKS_SOCIAL_ENABLED", true),
    ADMIN_ENABLED: envBool("JU_PICKS_ADMIN_ENABLED", true),
    NOTIFICATIONS_ENABLED: envBool("JU_PICKS_NOTIFICATIONS_ENABLED", true),
    MAX_PICKS_PER_ENTRY: envInt("JU_PICKS_MAX_PICKS", 20),
    MAX_ENTRY_AMOUNT_CREDITS: envInt("JU_PICKS_MAX_ENTRY", 100000),
    STARTING_CREDITS: envInt("JU_PICKS_STARTING_CREDITS", 10000),
  };
}

export function isRealMoneyEnabled(): boolean {
  return false; // Hard gate. Never true for MVP.
}

export function getStartingCredits(): number {
  return getFeatureFlags().STARTING_CREDITS;
}
