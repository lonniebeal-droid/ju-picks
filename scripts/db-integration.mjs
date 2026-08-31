#!/usr/bin/env node
/**
 * JU PICKS database integration tests against DATABASE_URL.
 * Requires migrations already applied (scripts/migrate.mjs).
 *
 * Creates two synthetic auth users via profiles only (no Supabase Auth JWT).
 * SECURITY DEFINER RPCs accept p_user_id when auth.uid() is null (service role style).
 *
 * If DATABASE_URL is unset: exit 0 with SKIP message (local hosts without PG).
 * CI must set DATABASE_URL and fail on test failure.
 */

import pg from "pg";

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const requireDb = process.env.CI === "true" || process.env.JP_REQUIRE_DB === "true";

if (!databaseUrl) {
  if (requireDb) {
    console.error("DATABASE_URL required in CI");
    process.exit(1);
  }
  console.log("SKIP: DATABASE_URL not set — DB integration tests not executed");
  process.exit(0);
}

const { Client } = pg;
let passed = 0;
let failed = 0;

function assert(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const userA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const userB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const contestId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const proj1 = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const proj2 = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
  const sportId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
  const teamId = "11111111-1111-1111-1111-111111111111";
  const playerId = "22222222-2222-2222-2222-222222222222";
  const eventId = "33333333-3333-3333-3333-333333333333";
  const statId = "44444444-4444-4444-4444-444444444444";

  console.log("DB integration tests\n");

  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE settlement_runs, wallet_transactions, entry_picks, entries,
               projection_results, contest_reward_configs, projections,
               events, players, teams, sports, stat_types, contest_types,
               wallets, profiles CASCADE
    `);

    await client.query(
      `INSERT INTO profiles (user_id, email, role) VALUES
        ($1, 'a@test.local', 'user'),
        ($2, 'b@test.local', 'user')`,
      [userA, userB],
    );
    await client.query(
      `INSERT INTO wallets (user_id, wallet_kind, balance_cents) VALUES
        ($1, 'play', 0), ($2, 'play', 0)`,
      [userA, userB],
    );
    await client.query(
      `INSERT INTO contest_types (contest_type_id, name, mode, active)
       VALUES ($1, 'Flex Test', 'FLEX', true)`,
      [contestId],
    );
    await client.query(
      `INSERT INTO sports (sport_id, name, abbr) VALUES ($1, 'NFL', 'NFL')`,
      [sportId],
    );
    await client.query(
      `INSERT INTO teams (team_id, sport_id, name, abbr) VALUES ($1, $2, 'Test', 'TST')`,
      [teamId, sportId],
    );
    await client.query(
      `INSERT INTO players (player_id, team_id, display_name) VALUES ($1, $2, 'Test Player')`,
      [playerId, teamId],
    );
    await client.query(
      `INSERT INTO events (event_id, sport_id, home_team_id, away_team_id, starts_at, status)
       VALUES ($1, $2, $3, $3, now() + interval '1 day', 'scheduled')`,
      [eventId, sportId, teamId],
    );
    await client.query(
      `INSERT INTO stat_types (stat_type_id, name, abbr) VALUES ($1, 'Yards', 'YDS')`,
      [statId],
    );
    await client.query(
      `INSERT INTO projections (projection_id, event_id, player_id, stat_type_id, line, status)
       VALUES ($1, $3, $4, $5, 100.5, 'open'), ($2, $3, $4, $5, 50.5, 'open')`,
      [proj1, proj2, eventId, playerId, statId],
    );
    await client.query("COMMIT");

    console.log("Starting credit");
    let r = await client.query(
      `SELECT * FROM jp_grant_starting_credit(100000, 'start-a-v1', $1)`,
      [userA],
    );
    assert("first grant succeeds", r.rows[0].granted === true);
    assert("balance 100000", Number(r.rows[0].balance_cents) === 100000);

    r = await client.query(
      `SELECT * FROM jp_grant_starting_credit(100000, 'start-a-v1', $1)`,
      [userA],
    );
    assert("repeat grant not duplicate", r.rows[0].granted === false);
    assert("balance still 100000", Number(r.rows[0].balance_cents) === 100000);

    r = await client.query(
      `SELECT count(*)::int AS c FROM wallet_transactions
       WHERE user_id = $1 AND type = 'STARTING_CREDIT'`,
      [userA],
    );
    assert("starting credit ledger once", r.rows[0].c === 1);

    console.log("Entry placement");
    const picks = JSON.stringify([
      { projectionId: proj1, direction: "HIGHER" },
      { projectionId: proj2, direction: "LOWER" },
    ]);
    r = await client.query(
      `SELECT * FROM jp_place_entry($1, 500, $2::jsonb, false, 'entry-idem-1', $3)`,
      [contestId, picks, userA],
    );
    const entryId = r.rows[0].entry_id;
    assert("valid entry created", Boolean(entryId));
    assert("entry status open", r.rows[0].status === "open");

    r = await client.query(
      `SELECT balance_cents FROM wallets WHERE user_id = $1 AND wallet_kind = 'play'`,
      [userA],
    );
    assert("wallet debited once", Number(r.rows[0].balance_cents) === 99500);

    r = await client.query(
      `SELECT count(*)::int AS c FROM wallet_transactions
       WHERE user_id = $1 AND type = 'ENTRY_STAKE'`,
      [userA],
    );
    assert("ENTRY_STAKE once", r.rows[0].c === 1);

    r = await client.query(
      `SELECT count(*)::int AS c FROM entry_picks WHERE entry_id = $1`,
      [entryId],
    );
    assert("two picks", r.rows[0].c === 2);

    r = await client.query(
      `SELECT locked_line FROM entry_picks WHERE entry_id = $1 AND projection_id = $2`,
      [entryId, proj1],
    );
    assert("locked line persisted", Number(r.rows[0].locked_line) === 100.5);

    r = await client.query(
      `SELECT * FROM jp_place_entry($1, 500, $2::jsonb, false, 'entry-idem-1', $3)`,
      [contestId, picks, userA],
    );
    assert("idempotent same entry", r.rows[0].entry_id === entryId);
    r = await client.query(
      `SELECT balance_cents FROM wallets WHERE user_id = $1`,
      [userA],
    );
    assert("no second debit", Number(r.rows[0].balance_cents) === 99500);

    let threw = false;
    try {
      await client.query(
        `SELECT * FROM jp_place_entry($1, 999999, $2::jsonb, false, 'entry-big', $3)`,
        [contestId, picks, userA],
      );
    } catch (e) {
      threw = /INSUFFICIENT/i.test(String(e.message));
    }
    assert("insufficient funds rejected", threw);

    threw = false;
    try {
      const dup = JSON.stringify([
        { projectionId: proj1, direction: "HIGHER" },
        { projectionId: proj1, direction: "LOWER" },
      ]);
      await client.query(
        `SELECT * FROM jp_place_entry($1, 10, $2::jsonb, false, 'entry-dup', $3)`,
        [contestId, dup, userA],
      );
    } catch (e) {
      threw = /DUPLICATE_PICK/i.test(String(e.message));
    }
    assert("duplicate projection rejected", threw);

    threw = false;
    try {
      await client.query(
        `SELECT * FROM jp_place_entry($1, 0, $2::jsonb, false, 'entry-zero', $3)`,
        [contestId, picks, userA],
      );
    } catch (e) {
      threw = /INVALID_ENTRY/i.test(String(e.message));
    }
    assert("zero stake rejected", threw);

    threw = false;
    try {
      await client.query(
        `SELECT * FROM jp_place_entry($1, 1000001, $2::jsonb, false, 'entry-max', $3)`,
        [contestId, picks, userA],
      );
    } catch (e) {
      threw = /INVALID_ENTRY/i.test(String(e.message));
    }
    assert("over max stake rejected", threw);

    console.log("Refunds");
    r = await client.query(
      `SELECT * FROM jp_refund_entry($1, 'refund-1', $2)`,
      [entryId, userA],
    );
    assert("refund succeeds", r.rows[0].refunded === true);
    assert("balance restored", Number(r.rows[0].balance_cents) === 100000);

    r = await client.query(
      `SELECT * FROM jp_refund_entry($1, 'refund-1', $2)`,
      [entryId, userA],
    );
    assert("duplicate refund no-op", r.rows[0].refunded === false);

    threw = false;
    try {
      const r2 = await client.query(
        `SELECT * FROM jp_place_entry($1, 100, $2::jsonb, false, 'entry-cross', $3)`,
        [contestId, picks, userA],
      );
      const eid2 = r2.rows[0].entry_id;
      await client.query(
        `SELECT * FROM jp_refund_entry($1, 'refund-b', $2)`,
        [eid2, userB],
      );
    } catch (e) {
      threw = /ENTRY_NOT_FOUND|NOT_AUTHORIZED|NOT_FOUND/i.test(String(e.message));
    }
    assert("cross-user refund rejected", threw);

    console.log("Settlement");
    r = await client.query(
      `SELECT * FROM jp_place_entry($1, 200, $2::jsonb, true, 'entry-settle', $3)`,
      [contestId, picks, userA],
    );
    const settleEntry = r.rows[0].entry_id;

    await client.query(
      `INSERT INTO contest_reward_configs (contest_type_id, mode, win_multiplier, flex_rules)
       VALUES ($1, 'POWER', 3, NULL)
       ON CONFLICT (contest_type_id) DO UPDATE SET mode = 'POWER', win_multiplier = 3`,
      [contestId],
    );

    const settlePicks = JSON.stringify([
      { projectionId: proj1, outcome: "WIN", actualValue: 120 },
      { projectionId: proj2, outcome: "WIN", actualValue: 40 },
    ]);

    r = await client.query(
      `SELECT * FROM jp_apply_settlement($1, 'WIN', $2::jsonb, 600, 'settle-win-1', 0)`,
      [settleEntry, settlePicks],
    );
    assert("settlement WIN", r.rows[0].outcome === "WIN" && r.rows[0].credited === true);

    r = await client.query(
      `SELECT * FROM jp_apply_settlement($1, 'WIN', $2::jsonb, 600, 'settle-win-1', 0)`,
      [settleEntry, settlePicks],
    );
    assert("settlement idempotent replay", r.rows[0].already_settled === true);

    r = await client.query(
      `SELECT count(*)::int AS c FROM wallet_transactions
       WHERE entry_id = $1 AND type = 'ENTRY_WIN'`,
      [settleEntry],
    );
    assert("ENTRY_WIN ledger once", r.rows[0].c === 1);

    threw = false;
    try {
      await client.query(
        `SELECT * FROM jp_apply_settlement($1, 'WIN', $2::jsonb, 600, 'settle-win-2', 0)`,
        [settleEntry, settlePicks],
      );
    } catch (e) {
      threw = /SETTLEMENT_ALREADY_APPLIED/i.test(String(e.message));
    }
    assert("second settlement key rejected", threw);

    r = await client.query(
      `SELECT * FROM jp_place_entry($1, 50, $2::jsonb, false, 'entry-loss', $3)`,
      [contestId, picks, userA],
    );
    const lossEntry = r.rows[0].entry_id;
    const lossPicks = JSON.stringify([
      { projectionId: proj1, outcome: "LOSS", actualValue: 10 },
      { projectionId: proj2, outcome: "WIN", actualValue: 10 },
    ]);
    r = await client.query(
      `SELECT * FROM jp_apply_settlement($1, 'LOSS', $2::jsonb, 0, 'settle-loss-1', 0)`,
      [lossEntry, lossPicks],
    );
    assert("settlement LOSS", r.rows[0].outcome === "LOSS");
    r = await client.query(
      `SELECT count(*)::int AS c FROM wallet_transactions
       WHERE entry_id = $1 AND type = 'ENTRY_WIN'`,
      [lossEntry],
    );
    assert("LOSS no ENTRY_WIN", r.rows[0].c === 0);

    r = await client.query(
      `SELECT * FROM jp_place_entry($1, 75, $2::jsonb, false, 'entry-push', $3)`,
      [contestId, picks, userA],
    );
    const pushEntry = r.rows[0].entry_id;
    const balBefore = await client.query(
      `SELECT balance_cents FROM wallets WHERE user_id = $1`,
      [userA],
    );
    const before = Number(balBefore.rows[0].balance_cents);
    r = await client.query(
      `SELECT * FROM jp_apply_settlement($1, 'PUSH', $2::jsonb, 0, 'settle-push-1', 0)`,
      [
        pushEntry,
        JSON.stringify([
          { projectionId: proj1, outcome: "PUSH", actualValue: 100.5 },
          { projectionId: proj2, outcome: "PUSH", actualValue: 50.5 },
        ]),
      ],
    );
    assert("settlement PUSH", r.rows[0].outcome === "PUSH");
    const balAfter = await client.query(
      `SELECT balance_cents FROM wallets WHERE user_id = $1`,
      [userA],
    );
    assert(
      "PUSH refunds stake",
      Number(balAfter.rows[0].balance_cents) === before + 75,
    );

    console.log("Cross-user isolation (RPC)");
    await client.query(
      `SELECT * FROM jp_grant_starting_credit(50000, 'start-b-v1', $1)`,
      [userB],
    );
    r = await client.query(
      `SELECT * FROM jp_get_virtual_balance($1)`,
      [userB],
    );
    assert("user B balance independent", Number(r.rows[0].balance_cents) === 50000);

    r = await client.query(
      `SELECT * FROM jp_get_ledger($1, 10, 0)`,
      [userA],
    );
    const typesA = r.rows.map((row) => row.type);
    assert("user A ledger has entries", typesA.length > 0);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("FATAL:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
