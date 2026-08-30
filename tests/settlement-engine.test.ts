import { describe, it, expect } from "vitest";
import {
  settlePick,
  summarizePickOutcomes,
  determinePowerOutcome,
  determineFlexOutcome,
  determineEntryOutcome,
  resolveRewardCredits,
  settleEntryPicks,
} from "~/lib/settlement/engine";
import type { SettlementRewardConfig } from "~/lib/settlement/types";

const CONTEST = "11111111-1111-1111-1111-111111111111";

describe("settlePick HIGHER", () => {
  it("WIN when actual > line", () => {
    expect(
      settlePick({
        direction: "HIGHER",
        line: 10,
        actualValue: 12,
        isVoid: false,
        isFinal: true,
      }),
    ).toBe("WIN");
  });
  it("LOSS when actual < line", () => {
    expect(
      settlePick({
        direction: "HIGHER",
        line: 10,
        actualValue: 8,
        isVoid: false,
        isFinal: true,
      }),
    ).toBe("LOSS");
  });
  it("PUSH when actual === line", () => {
    expect(
      settlePick({
        direction: "HIGHER",
        line: 10,
        actualValue: 10,
        isVoid: false,
        isFinal: true,
      }),
    ).toBe("PUSH");
  });
});

describe("settlePick LOWER", () => {
  it("WIN when actual < line", () => {
    expect(
      settlePick({
        direction: "LOWER",
        line: 10,
        actualValue: 7,
        isVoid: false,
        isFinal: true,
      }),
    ).toBe("WIN");
  });
  it("LOSS when actual > line", () => {
    expect(
      settlePick({
        direction: "LOWER",
        line: 10,
        actualValue: 15,
        isVoid: false,
        isFinal: true,
      }),
    ).toBe("LOSS");
  });
  it("PUSH when actual === line", () => {
    expect(
      settlePick({
        direction: "LOWER",
        line: 10,
        actualValue: 10,
        isVoid: false,
        isFinal: true,
      }),
    ).toBe("PUSH");
  });
});

describe("settlePick VOID / PENDING", () => {
  it("VOID when isVoid", () => {
    expect(
      settlePick({
        direction: "HIGHER",
        line: 10,
        actualValue: 20,
        isVoid: true,
        isFinal: true,
      }),
    ).toBe("VOID");
  });
  it("PENDING when not final", () => {
    expect(
      settlePick({
        direction: "HIGHER",
        line: 10,
        actualValue: 20,
        isVoid: false,
        isFinal: false,
      }),
    ).toBe("PENDING");
  });
  it("PENDING when actualValue null even if final", () => {
    expect(
      settlePick({
        direction: "HIGHER",
        line: 10,
        actualValue: null,
        isVoid: false,
        isFinal: true,
      }),
    ).toBe("PENDING");
  });
});

describe("Power outcomes", () => {
  it("PENDING if any pending", () => {
    expect(determinePowerOutcome(summarizePickOutcomes(["WIN", "PENDING"]))).toBe(
      "PENDING",
    );
  });
  it("LOSS if any loss", () => {
    expect(determinePowerOutcome(summarizePickOutcomes(["WIN", "LOSS"]))).toBe(
      "LOSS",
    );
  });
  it("WIN when all wins", () => {
    expect(determinePowerOutcome(summarizePickOutcomes(["WIN", "WIN"]))).toBe(
      "WIN",
    );
  });
  it("PUSH when only pushes", () => {
    expect(determinePowerOutcome(summarizePickOutcomes(["PUSH", "PUSH"]))).toBe(
      "PUSH",
    );
  });
  it("VOID when only voids", () => {
    expect(determinePowerOutcome(summarizePickOutcomes(["VOID"]))).toBe("VOID");
  });
});

describe("Flex outcomes", () => {
  it("pure win", () => {
    expect(determineFlexOutcome(summarizePickOutcomes(["WIN", "WIN"]))).toBe(
      "WIN",
    );
  });
  it("pure loss", () => {
    expect(determineFlexOutcome(summarizePickOutcomes(["LOSS", "LOSS"]))).toBe(
      "LOSS",
    );
  });
  it("mixed requires config", () => {
    expect(
      determineFlexOutcome(summarizePickOutcomes(["WIN", "LOSS"])),
    ).toBe("REQUIRES_CONFIG");
  });
  it("push only", () => {
    expect(determineFlexOutcome(summarizePickOutcomes(["PUSH"]))).toBe("PUSH");
  });
  it("void only", () => {
    expect(determineFlexOutcome(summarizePickOutcomes(["VOID"]))).toBe("VOID");
  });
});

describe("determineEntryOutcome Flex mixed", () => {
  it("flags requiresContestConfig for mixed", () => {
    const r = determineEntryOutcome("FLEX", ["WIN", "LOSS"]);
    expect(r.requiresContestConfig).toBe(true);
    expect(r.outcome).toBe("PENDING");
  });
});

describe("resolveRewardCredits Power", () => {
  it("requires winMultiplier", () => {
    const structural = determineEntryOutcome("POWER", ["WIN", "WIN"]);
    const r = resolveRewardCredits("POWER", 100, structural, null);
    expect(r.available).toBe(false);
    expect(r.rewardCredits).toBeNull();
  });
  it("applies winMultiplier", () => {
    const structural = determineEntryOutcome("POWER", ["WIN"]);
    const config: SettlementRewardConfig = {
      contestTypeId: CONTEST,
      mode: "POWER",
      winMultiplier: 3,
      flexRules: null,
    };
    const r = resolveRewardCredits("POWER", 100, structural, config);
    expect(r.available).toBe(true);
    expect(r.rewardCredits).toBe(300);
  });
});

describe("resolveRewardCredits Flex rules", () => {
  it("matches explicit flexRules", () => {
    const structural = determineEntryOutcome("FLEX", ["WIN", "WIN"]);
    const config: SettlementRewardConfig = {
      contestTypeId: CONTEST,
      mode: "FLEX",
      winMultiplier: null,
      flexRules: [
        { minWins: 2, maxLosses: 0, outcome: "WIN", multiplier: 2.5 },
        { minWins: 1, maxLosses: 1, outcome: "WIN", multiplier: 1.5 },
      ],
    };
    const r = resolveRewardCredits("FLEX", 100, structural, config);
    expect(r.available).toBe(true);
    expect(r.rewardCredits).toBe(250);
  });
  it("no match => unavailable", () => {
    const structural = determineEntryOutcome("FLEX", ["WIN"]);
    const config: SettlementRewardConfig = {
      contestTypeId: CONTEST,
      mode: "FLEX",
      winMultiplier: null,
      flexRules: [
        { minWins: 3, maxLosses: 0, outcome: "WIN", multiplier: 5 },
      ],
    };
    const r = resolveRewardCredits("FLEX", 100, structural, config);
    expect(r.available).toBe(false);
    expect(r.rewardCredits).toBeNull();
  });
});

describe("settleEntryPicks locked line", () => {
  it("uses locked line not a different value", () => {
    const pid = "22222222-2222-2222-2222-222222222222";
    const picks = [
      {
        projectionId: pid,
        direction: "HIGHER" as const,
        lockedLine: 25.5,
      },
    ];
    const map = new Map([
      [
        pid,
        {
          projectionId: pid,
          actualValue: 30,
          isFinal: true,
          isVoid: false,
        },
      ],
    ]);
    const settled = settleEntryPicks(picks, map);
    expect(settled[0].line).toBe(25.5);
    expect(settled[0].outcome).toBe("WIN");
  });
});
