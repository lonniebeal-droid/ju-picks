/**
 * JU PICKS — Provider registry
 * Mock only when NODE_ENV !== production AND JU_PICKS_SPORTS_PROVIDER=mock
 */

import type { SportsDataProvider } from "./provider";
import { ProviderError } from "./provider";
import { MockSportsProvider } from "./providers/mock-provider";

function resolveEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
}

function isProduction(): boolean {
  return (resolveEnv("NODE_ENV") || "production") === "production";
}

export function getSportsProvider(): SportsDataProvider {
  const flag = (resolveEnv("JU_PICKS_SPORTS_PROVIDER") || "")
    .trim()
    .toLowerCase();

  if (!isProduction() && flag === "mock") {
    return new MockSportsProvider();
  }

  if (isProduction() && flag === "mock") {
    throw new ProviderError(
      "PROVIDER_NOT_CONFIGURED",
      "Mock sports provider is not allowed in production",
    );
  }

  throw new ProviderError(
    "PROVIDER_NOT_CONFIGURED",
    "No sports data provider configured",
  );
}
