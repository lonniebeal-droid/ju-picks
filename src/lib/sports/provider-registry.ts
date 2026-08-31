/**
 * JU PICKS — Provider registry
 * Static demo data is the default (production-safe).
 * Mock provider is dev-only. Live provider requires API keys.
 */

import type { SportsDataProvider } from "./provider";
import { ProviderError } from "./provider";
import { MockSportsProvider } from "./providers/mock-provider";
import { StaticDemoProvider } from "./providers/static-demo";

function resolveEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
}

function isProduction(): boolean {
  return (resolveEnv("NODE_ENV") || "production") === "production";
}

let cached: SportsDataProvider | null = null;

export function getSportsProvider(): SportsDataProvider {
  if (cached) return cached;

  const flag = (resolveEnv("JU_PICKS_SPORTS_PROVIDER") || "demo")
    .trim()
    .toLowerCase();

  if (flag === "mock" && !isProduction()) {
    cached = new MockSportsProvider();
    return cached;
  }

  if (flag === "mock" && isProduction()) {
    // Fall through to static demo — mock is dev-only.
  }

  if (flag === "live") {
    throw new ProviderError(
      "PROVIDER_NOT_CONFIGURED",
      "Live sports provider is not configured for this MVP. Using demo data.",
    );
  }

  // Default: static demo data (production-safe, clearly synthetic)
  cached = new StaticDemoProvider();
  return cached;
}
