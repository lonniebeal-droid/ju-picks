import { describe, it, expect } from "vitest";
import {
  createEmptyEntryBuilder,
  addPick,
  removePick,
  setPickDirection,
  setEntryMode,
  setEntryAmount,
  setContestTypeId,
  validateBuilder,
  buildSubmission,
  estimatePotentialReward,
} from "~/lib/entries/builder";
import { EntryError } from "~/lib/entries/errors";

const P1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const P2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CONTEST = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe("entry builder", () => {
  it("creates empty builder", () => {
    const s = createEmptyEntryBuilder();
    expect(s.picks).toEqual([]);
    expect(s.mode).toBe("FLEX");
    expect(s.entryAmountCredits).toBe(0);
  });

  it("adds pick", () => {
    let s = createEmptyEntryBuilder();
    s = addPick(s, { projectionId: P1, direction: "HIGHER" });
    expect(s.picks).toHaveLength(1);
  });

  it("rejects duplicate projection", () => {
    let s = createEmptyEntryBuilder();
    s = addPick(s, { projectionId: P1, direction: "HIGHER" });
    expect(() =>
      addPick(s, { projectionId: P1, direction: "LOWER" }),
    ).toThrow(EntryError);
  });

  it("removes pick", () => {
    let s = createEmptyEntryBuilder();
    s = addPick(s, { projectionId: P1, direction: "HIGHER" });
    s = removePick(s, P1);
    expect(s.picks).toHaveLength(0);
  });

  it("sets direction", () => {
    let s = createEmptyEntryBuilder();
    s = addPick(s, { projectionId: P1, direction: "HIGHER" });
    s = setPickDirection(s, P1, "LOWER");
    expect(s.picks[0].direction).toBe("LOWER");
  });

  it("sets mode and amount", () => {
    let s = createEmptyEntryBuilder();
    s = setEntryMode(s, "POWER");
    s = setEntryAmount(s, 500);
    expect(s.mode).toBe("POWER");
    expect(s.entryAmountCredits).toBe(500);
  });

  it("rejects invalid amount", () => {
    const s = createEmptyEntryBuilder();
    expect(() => setEntryAmount(s, 0)).not.toThrow(); // 0 allowed in state
    expect(() => setEntryAmount(s, -1)).toThrow(EntryError);
    expect(() => setEntryAmount(s, 1_000_001)).toThrow(EntryError);
  });

  it("validates before submit", () => {
    let s = createEmptyEntryBuilder();
    expect(validateBuilder(s).valid).toBe(false);
    s = setContestTypeId(s, CONTEST);
    s = addPick(s, { projectionId: P1, direction: "HIGHER" });
    s = setEntryAmount(s, 100);
    expect(validateBuilder(s).valid).toBe(true);
  });

  it("buildSubmission strips display fields and sets powerMode", () => {
    let s = createEmptyEntryBuilder();
    s = setContestTypeId(s, CONTEST);
    s = addPick(s, {
      projectionId: P1,
      direction: "HIGHER",
      playerName: "Test",
      line: 99,
    });
    s = addPick(s, { projectionId: P2, direction: "LOWER" });
    s = setEntryMode(s, "POWER");
    s = setEntryAmount(s, 250);
    const sub = buildSubmission(s, "idem-key-12345");
    expect(sub.powerMode).toBe(true);
    expect(sub.picks).toEqual([
      { projectionId: P1, direction: "HIGHER" },
      { projectionId: P2, direction: "LOWER" },
    ]);
    expect(sub.idempotencyKey).toBe("idem-key-12345");
  });

  it("estimate returns unavailable without multiplier", () => {
    let s = createEmptyEntryBuilder();
    s = setEntryAmount(s, 100);
    s = addPick(s, { projectionId: P1, direction: "HIGHER" });
    const e = estimatePotentialReward(s, null);
    expect(e.available).toBe(false);
    expect(e.estimatedCredits).toBeNull();
  });

  it("estimate is display-only math when multiplier provided", () => {
    let s = createEmptyEntryBuilder();
    s = setEntryAmount(s, 100);
    s = addPick(s, { projectionId: P1, direction: "HIGHER" });
    const e = estimatePotentialReward(s, 3);
    expect(e.available).toBe(true);
    expect(e.estimatedCredits).toBe(300);
  });
});
