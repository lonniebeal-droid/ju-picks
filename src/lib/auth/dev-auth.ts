/**
 * JU PICKS — Dev auth gate
 * Synthetic auth is IMPOSSIBLE in production.
 * Allowed ONLY when NODE_ENV !== "production" AND JU_PICKS_DEV_AUTH === "true"
 */

export function isDevAuthAllowed(): boolean {
  const nodeEnv =
    (typeof process !== "undefined" && process.env?.NODE_ENV) || "production";
  const flag =
    (typeof process !== "undefined" && process.env?.JU_PICKS_DEV_AUTH) || "";
  return nodeEnv !== "production" && String(flag) === "true";
}

export function getSyntheticDevUser(): {
  id: string;
  email: string;
  name: string;
} | null {
  if (!isDevAuthAllowed()) return null;
  return {
    id: "dev-user",
    email: "dev@localhost",
    name: "Dev User",
  };
}

export function assertNotProductionDevAuth(): void {
  const nodeEnv =
    (typeof process !== "undefined" && process.env?.NODE_ENV) || "production";
  if (nodeEnv === "production" && process.env?.JU_PICKS_DEV_AUTH === "true") {
    // Even if flag is set, production must never honor synthetic auth.
    // Flag is ignored; fail closed by design.
  }
}

export function isRealMoneyEnabled(): boolean {
  return (
    typeof process !== "undefined" && process.env?.REAL_MONEY_ENABLED === "true"
  );
}
