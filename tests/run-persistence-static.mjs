/**
 * Static persistence contract checks (no live DB).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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

const m1 = resolve(root, "supabase/migrations/202508300001_foundation.sql");
const m2 = resolve(root, "supabase/migrations/202508300002_jp_rpcs.sql");
const m3 = resolve(root, "supabase/migrations/202508300003_persistence_hardening.sql");

console.log("Persistence static checks\n");

assert("foundation migration exists", existsSync(m1));
assert("jp RPCs migration exists", existsSync(m2));
assert("hardening migration exists", existsSync(m3));

const sql2 = readFileSync(m2, "utf8");
const sql3 = readFileSync(m3, "utf8");

for (const fn of [
  "jp_ensure_profile",
  "jp_get_virtual_balance",
  "jp_get_ledger",
  "jp_grant_starting_credit",
  "jp_place_entry",
  "jp_refund_entry",
  "jp_apply_settlement",
]) {
  assert(`defines ${fn}`, sql2.includes(`FUNCTION ${fn}`));
}

assert("defines jp_set_session (txn-local)", sql3.includes("jp_set_session"));
assert("set_config is_local true", sql3.includes("set_config('jupicks.uid'"));
assert("settlement service_role only", sql2.includes("jp_apply_settlement TO service_role"));
assert("no flexTiers", !sql2.toLowerCase().includes("flextiers") && !sql3.toLowerCase().includes("flextiers"));
assert("flex_rules column", sql2.includes("flex_rules"));
assert("INSUFFICIENT_CREDITS", sql2.includes("INSUFFICIENT_CREDITS"));
assert("ENTRY_STAKE ledger type", sql2.includes("'ENTRY_STAKE'"));
assert("ENTRY_WIN ledger type", sql2.includes("'ENTRY_WIN'"));
assert("FOR UPDATE locking", sql2.includes("FOR UPDATE"));
assert("settlement_runs unique idempotency", sql2.includes("UNIQUE (entry_id, idempotency_key)"));
assert("play wallet only in foundation", readFileSync(m1, "utf8").includes("wallet_kind = 'play'"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
