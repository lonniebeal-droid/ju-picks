import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isDevAuthAllowed,
  getSyntheticDevUser,
  isRealMoneyEnabled,
} from "~/lib/auth/dev-auth";

const origEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...origEnv };
});

afterEach(() => {
  process.env = { ...origEnv };
});

describe("dev auth gate", () => {
  it("rejects synthetic auth in production even if flag set", () => {
    process.env.NODE_ENV = "production";
    process.env.JU_PICKS_DEV_AUTH = "true";
    expect(isDevAuthAllowed()).toBe(false);
    expect(getSyntheticDevUser()).toBeNull();
  });

  it("rejects when flag false in development", () => {
    process.env.NODE_ENV = "development";
    process.env.JU_PICKS_DEV_AUTH = "false";
    expect(isDevAuthAllowed()).toBe(false);
    expect(getSyntheticDevUser()).toBeNull();
  });

  it("allows only when both gates open", () => {
    process.env.NODE_ENV = "development";
    process.env.JU_PICKS_DEV_AUTH = "true";
    expect(isDevAuthAllowed()).toBe(true);
    const u = getSyntheticDevUser();
    expect(u?.id).toBe("dev-user");
  });

  it("rejects missing flag", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JU_PICKS_DEV_AUTH;
    expect(isDevAuthAllowed()).toBe(false);
  });
});

describe("real money hard gate", () => {
  it("disabled by default", () => {
    delete process.env.REAL_MONEY_ENABLED;
    expect(isRealMoneyEnabled()).toBe(false);
  });

  it("only true when explicitly true", () => {
    process.env.REAL_MONEY_ENABLED = "true";
    expect(isRealMoneyEnabled()).toBe(true);
    process.env.REAL_MONEY_ENABLED = "false";
    expect(isRealMoneyEnabled()).toBe(false);
  });
});
