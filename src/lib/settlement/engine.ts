/**
 * JU PICKS — Pure deterministic settlement engine
 * No DB. No auth. No wallet. No API calls.
 */

import {
  SettlePickInputSchema,
  type SettlePickInput,
  type PickOutcome,
  type SettledPick,
  type PickOutcomeSummary,
  type EntryOutcomeResult,
  type EntryOutcome,
  type EntryMode,
  type SettlementRewardConfig,
  type SettlementRewardResult,
  type SettlementEntryPick,
  type FinalProjectionResult,
  type FlexOutcomeRule,
} from "./types";
import { SettlementError } from "./errors";

export function settlePick(raw: SettlePickInput): PickOutcome {
  const input = SettlePickInputSchema.parse(raw);
  if (!input.isFinal) return "PENDING";
  if (input.isVoid) return "VOID";
  if (input.actualValue === null) return "PENDING";
  const { direction, line, actualValue } = input;
  if (direction === "HIGHER") {
    if (actualValue > line) return "WIN";
    if (actualValue < line) return "LOSS";
    return "PUSH";
  }
  if (actualValue < line) return "WIN";
  if (actualValue > line) return "LOSS";
  return "PUSH";
}

export function summarizePickOutcomes(
  outcomes: PickOutcome[],
): PickOutcomeSummary {
  const summary: PickOutcomeSummary = {
    wins: 0,
    losses: 0,
    pushes: 0,
    voids: 0,
    pending: 0,
    total: outcomes.length,
    resolved: 0,
  };
  for (const o of outcomes) {
    switch (o) {
      case "WIN":
        summary.wins += 1;
        summary.resolved += 1;
        break;
      case "LOSS":
        summary.losses += 1;
        summary.resolved += 1;
        break;
      case "PUSH":
        summary.pushes += 1;
        summary.resolved += 1;
        break;
      case "VOID":
        summary.voids += 1;
        summary.resolved += 1;
        break;
      case "PENDING":
        summary.pending += 1;
        break;
    }
  }
  return summary;
}

export function determinePowerOutcome(
  summary: PickOutcomeSummary,
): EntryOutcome {
  if (summary.pending > 0) return "PENDING";
  if (summary.losses > 0) return "LOSS";
  if (summary.wins > 0) return "WIN";
  if (summary.pushes > 0) return "PUSH";
  if (summary.voids > 0) return "VOID";
  return "PENDING";
}

export function determineFlexOutcome(
  summary: PickOutcomeSummary,
): EntryOutcome | "REQUIRES_CONFIG" {
  if (summary.pending > 0) return "PENDING";
  if (summary.wins === 0 && summary.losses > 0) return "LOSS";
  if (summary.wins > 0 && summary.losses === 0) return "WIN";
  if (summary.wins === 0 && summary.losses === 0) {
    if (summary.pushes > 0) return "PUSH";
    if (summary.voids > 0) return "VOID";
    return "PENDING";
  }
  return "REQUIRES_CONFIG";
}

export function determineEntryOutcome(
  mode: EntryMode,
  pickOutcomes: PickOutcome[],
): EntryOutcomeResult & { requiresContestConfig: boolean } {
  const summary = summarizePickOutcomes(pickOutcomes);
  const effectivePickCount = Math.max(0, summary.total - summary.voids);
  if (mode === "POWER") {
    return {
      outcome: determinePowerOutcome(summary),
      summary,
      effectivePickCount,
      requiresContestConfig: false,
    };
  }
  const flex = determineFlexOutcome(summary);
  if (flex === "REQUIRES_CONFIG") {
    return {
      outcome: "PENDING",
      summary,
      effectivePickCount,
      requiresContestConfig: true,
    };
  }
  return {
    outcome: flex,
    summary,
    effectivePickCount,
    requiresContestConfig: false,
  };
}

export function settleEntryPicks(
  picks: SettlementEntryPick[],
  resultsByProjectionId: Map<string, FinalProjectionResult>,
): SettledPick[] {
  return picks.map((pick) => {
    const result = resultsByProjectionId.get(pick.projectionId);
    const outcome = settlePick({
      direction: pick.direction,
      line: pick.lockedLine,
      actualValue: result?.actualValue ?? null,
      isVoid: result?.isVoid ?? false,
      isFinal: result?.isFinal ?? false,
    });
    return {
      projectionId: pick.projectionId,
      direction: pick.direction,
      line: pick.lockedLine,
      actualValue: result?.actualValue ?? null,
      outcome,
    };
  });
}

function matchFlexRule(
  summary: PickOutcomeSummary,
  rules: FlexOutcomeRule[],
): FlexOutcomeRule | null {
  const sorted = [...rules].sort((a, b) => b.minWins - a.minWins);
  for (const rule of sorted) {
    if (summary.wins < rule.minWins) continue;
    if (rule.maxLosses != null && summary.losses > rule.maxLosses) continue;
    return rule;
  }
  return null;
}

export function resolveRewardCredits(
  mode: EntryMode,
  entryAmountCredits: number,
  outcomeResult: EntryOutcomeResult & { requiresContestConfig?: boolean },
  config: SettlementRewardConfig | null,
): SettlementRewardResult {
  if (outcomeResult.requiresContestConfig && !config) {
    return {
      rewardCredits: null,
      available: false,
      note: "Contest configuration required for Flex mixed outcomes",
    };
  }
  if (!config) {
    return {
      rewardCredits: null,
      available: false,
      note: "Contest reward configuration unavailable",
    };
  }
  if (config.mode !== mode) {
    return {
      rewardCredits: null,
      available: false,
      note: "Contest reward configuration mode mismatch",
    };
  }
  const { outcome, summary } = outcomeResult;
  if (outcome === "PENDING") {
    return {
      rewardCredits: null,
      available: false,
      note: "Entry still pending",
    };
  }
  if (outcome === "LOSS" || outcome === "VOID") {
    return {
      rewardCredits: 0,
      available: true,
      note: "No virtual reward for this outcome",
    };
  }
  if (outcome === "PUSH") {
    return {
      rewardCredits: 0,
      available: true,
      note: "Push — no win reward",
    };
  }
  if (mode === "POWER") {
    if (config.winMultiplier == null) {
      return {
        rewardCredits: null,
        available: false,
        note: "Power win multiplier unavailable",
      };
    }
    return {
      rewardCredits: Math.floor(entryAmountCredits * config.winMultiplier),
      available: true,
      note: "Power win reward from contest configuration",
    };
  }
  const rules = config.flexRules;
  if (!rules || rules.length === 0) {
    return {
      rewardCredits: null,
      available: false,
      note: "Flex outcome rules unavailable",
    };
  }
  const matched = matchFlexRule(summary, rules);
  if (!matched) {
    return {
      rewardCredits: null,
      available: false,
      note: "No matching Flex outcome rule",
    };
  }
  if (matched.outcome === "WIN") {
    const mult = matched.multiplier ?? null;
    if (mult == null || !(mult > 0)) {
      return {
        rewardCredits: null,
        available: false,
        note: "Flex WIN rule missing positive multiplier",
      };
    }
    return {
      rewardCredits: Math.floor(entryAmountCredits * mult),
      available: true,
      note: "Flex win reward from contest configuration",
    };
  }
  return {
    rewardCredits: 0,
    available: true,
    note: "Flex non-win outcome from contest configuration",
  };
}

export function assertValidMode(mode: string): EntryMode {
  if (mode === "POWER" || mode === "FLEX") return mode;
  throw new SettlementError("INVALID_SETTLEMENT_INPUT");
}

export { matchFlexRule };
