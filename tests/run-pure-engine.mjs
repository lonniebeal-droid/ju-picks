/**
 * Zero-dependency pure settlement engine tests (no vitest required).
 * Mirrors src/lib/settlement/engine.ts logic for offline verification.
 */

function settlePick({ direction, line, actualValue, isVoid, isFinal }) {
  if (!isFinal) return "PENDING";
  if (isVoid) return "VOID";
  if (actualValue === null) return "PENDING";
  if (direction === "HIGHER") {
    if (actualValue > line) return "WIN";
    if (actualValue < line) return "LOSS";
    return "PUSH";
  }
  if (actualValue < line) return "WIN";
  if (actualValue > line) return "LOSS";
  return "PUSH";
}

function summarize(outcomes) {
  const s = { wins: 0, losses: 0, pushes: 0, voids: 0, pending: 0, total: outcomes.length, resolved: 0 };
  for (const o of outcomes) {
    if (o === "WIN") { s.wins++; s.resolved++; }
    else if (o === "LOSS") { s.losses++; s.resolved++; }
    else if (o === "PUSH") { s.pushes++; s.resolved++; }
    else if (o === "VOID") { s.voids++; s.resolved++; }
    else s.pending++;
  }
  return s;
}

function powerOutcome(s) {
  if (s.pending > 0) return "PENDING";
  if (s.losses > 0) return "LOSS";
  if (s.wins > 0) return "WIN";
  if (s.pushes > 0) return "PUSH";
  if (s.voids > 0) return "VOID";
  return "PENDING";
}

function flexOutcome(s) {
  if (s.pending > 0) return "PENDING";
  if (s.wins === 0 && s.losses > 0) return "LOSS";
  if (s.wins > 0 && s.losses === 0) return "WIN";
  if (s.wins === 0 && s.losses === 0) {
    if (s.pushes > 0) return "PUSH";
    if (s.voids > 0) return "VOID";
    return "PENDING";
  }
  return "REQUIRES_CONFIG";
}

let passed = 0;
let failed = 0;

function assert(name, cond) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
  }
}

console.log("Settlement pure engine tests\n");

assert("HIGHER win", settlePick({ direction: "HIGHER", line: 10, actualValue: 12, isVoid: false, isFinal: true }) === "WIN");
assert("HIGHER loss", settlePick({ direction: "HIGHER", line: 10, actualValue: 8, isVoid: false, isFinal: true }) === "LOSS");
assert("HIGHER push", settlePick({ direction: "HIGHER", line: 10, actualValue: 10, isVoid: false, isFinal: true }) === "PUSH");
assert("LOWER win", settlePick({ direction: "LOWER", line: 10, actualValue: 7, isVoid: false, isFinal: true }) === "WIN");
assert("LOWER loss", settlePick({ direction: "LOWER", line: 10, actualValue: 15, isVoid: false, isFinal: true }) === "LOSS");
assert("LOWER push", settlePick({ direction: "LOWER", line: 10, actualValue: 10, isVoid: false, isFinal: true }) === "PUSH");
assert("VOID", settlePick({ direction: "HIGHER", line: 10, actualValue: 20, isVoid: true, isFinal: true }) === "VOID");
assert("PENDING not final", settlePick({ direction: "HIGHER", line: 10, actualValue: 20, isVoid: false, isFinal: false }) === "PENDING");
assert("PENDING null actual", settlePick({ direction: "HIGHER", line: 10, actualValue: null, isVoid: false, isFinal: true }) === "PENDING");

assert("Power win", powerOutcome(summarize(["WIN", "WIN"])) === "WIN");
assert("Power loss", powerOutcome(summarize(["WIN", "LOSS"])) === "LOSS");
assert("Power pending", powerOutcome(summarize(["WIN", "PENDING"])) === "PENDING");
assert("Power push", powerOutcome(summarize(["PUSH"])) === "PUSH");
assert("Power void", powerOutcome(summarize(["VOID"])) === "VOID");

assert("Flex pure win", flexOutcome(summarize(["WIN", "WIN"])) === "WIN");
assert("Flex pure loss", flexOutcome(summarize(["LOSS"])) === "LOSS");
assert("Flex mixed requires config", flexOutcome(summarize(["WIN", "LOSS"])) === "REQUIRES_CONFIG");
assert("Flex push", flexOutcome(summarize(["PUSH"])) === "PUSH");
assert("Flex void", flexOutcome(summarize(["VOID"])) === "VOID");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
