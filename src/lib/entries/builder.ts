/**
 * JU PICKS — Pure entry-builder domain logic
 * No DB. No auth. No wallet mutation.
 */

import {
  EntryBuilderStateSchema,
  EntrySubmissionSchema,
  PickDirectionSchema,
  EntryModeSchema,
  type EntryBuilderState,
  type EntryPickSelection,
  type EntrySubmission,
  type EntryMode,
  type PickDirection,
  type PotentialRewardEstimate,
} from "./types";
import { EntryError } from "./errors";

const MAX_PICKS = 20;
const MAX_ENTRY_AMOUNT = 1_000_000;

export function createEmptyEntryBuilder(
  contestTypeId?: string | null,
): EntryBuilderState {
  return {
    picks: [],
    mode: "FLEX",
    entryAmountCredits: 0,
    contestTypeId: contestTypeId ?? null,
  };
}

export function addPick(
  state: EntryBuilderState,
  pick: EntryPickSelection,
): EntryBuilderState {
  const parsed = EntryBuilderStateSchema.shape.picks.element.parse(pick);
  if (state.picks.some((p) => p.projectionId === parsed.projectionId)) {
    throw new EntryError("DUPLICATE_PICK");
  }
  if (state.picks.length >= MAX_PICKS) {
    throw new EntryError("INVALID_ENTRY");
  }
  return { ...state, picks: [...state.picks, parsed] };
}

export function removePick(
  state: EntryBuilderState,
  projectionId: string,
): EntryBuilderState {
  return {
    ...state,
    picks: state.picks.filter((p) => p.projectionId !== projectionId),
  };
}

export function setPickDirection(
  state: EntryBuilderState,
  projectionId: string,
  direction: PickDirection,
): EntryBuilderState {
  const dir = PickDirectionSchema.parse(direction);
  const idx = state.picks.findIndex((p) => p.projectionId === projectionId);
  if (idx < 0) throw new EntryError("PROJECTION_NOT_FOUND");
  const next = [...state.picks];
  next[idx] = { ...next[idx], direction: dir };
  return { ...state, picks: next };
}

export function setEntryMode(
  state: EntryBuilderState,
  mode: EntryMode,
): EntryBuilderState {
  return { ...state, mode: EntryModeSchema.parse(mode) };
}

export function setEntryAmount(
  state: EntryBuilderState,
  amountCredits: number,
): EntryBuilderState {
  if (
    !Number.isInteger(amountCredits) ||
    amountCredits < 0 ||
    amountCredits > MAX_ENTRY_AMOUNT
  ) {
    throw new EntryError("INVALID_ENTRY");
  }
  return { ...state, entryAmountCredits: amountCredits };
}

export function setContestTypeId(
  state: EntryBuilderState,
  contestTypeId: string,
): EntryBuilderState {
  return { ...state, contestTypeId };
}

export function validateBuilder(state: EntryBuilderState): {
  valid: boolean;
  errors: EntryError[];
} {
  const errors: EntryError[] = [];
  if (!state.contestTypeId) errors.push(new EntryError("INVALID_ENTRY"));
  if (state.picks.length < 1 || state.picks.length > MAX_PICKS) {
    errors.push(new EntryError("INVALID_ENTRY"));
  }
  const ids = state.picks.map((p) => p.projectionId);
  if (new Set(ids).size !== ids.length) {
    errors.push(new EntryError("DUPLICATE_PICK"));
  }
  if (
    !Number.isInteger(state.entryAmountCredits) ||
    state.entryAmountCredits < 1 ||
    state.entryAmountCredits > MAX_ENTRY_AMOUNT
  ) {
    errors.push(new EntryError("INVALID_ENTRY"));
  }
  for (const p of state.picks) {
    if (p.direction !== "HIGHER" && p.direction !== "LOWER") {
      errors.push(new EntryError("INVALID_ENTRY"));
      break;
    }
  }
  return { valid: errors.length === 0, errors };
}

export function buildSubmission(
  state: EntryBuilderState,
  idempotencyKey: string,
): EntrySubmission {
  const { valid, errors } = validateBuilder(state);
  if (!valid) throw errors[0] ?? new EntryError("INVALID_ENTRY");
  if (!state.contestTypeId) throw new EntryError("INVALID_ENTRY");
  return EntrySubmissionSchema.parse({
    contestTypeId: state.contestTypeId,
    entryAmountCredits: state.entryAmountCredits,
    picks: state.picks.map((p) => ({
      projectionId: p.projectionId,
      direction: p.direction,
    })),
    powerMode: state.mode === "POWER",
    idempotencyKey,
  });
}

/**
 * DISPLAY-ONLY estimate. Non-authoritative.
 * Returns unavailable when contest multiplier config is absent.
 */
export function estimatePotentialReward(
  state: EntryBuilderState,
  contestMultiplier?: number | null,
): PotentialRewardEstimate {
  if (
    contestMultiplier == null ||
    !Number.isFinite(contestMultiplier) ||
    contestMultiplier <= 0 ||
    state.entryAmountCredits < 1 ||
    state.picks.length < 1
  ) {
    return {
      estimatedCredits: null,
      available: false,
      note: "Potential reward estimate unavailable — contest configuration not loaded",
    };
  }
  return {
    estimatedCredits: Math.floor(state.entryAmountCredits * contestMultiplier),
    available: true,
    note: "Estimated virtual reward only. Not a guarantee. Settlement is authoritative.",
  };
}
