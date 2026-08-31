# JU PICKS — Build Status

## Source of truth

- Repo: `lonniebeal-droid/ju-picks` (private)
- Working branch: `feat/supabase-persistence`
- Sibling (Lovable export, reference only): `lonniebeal-droid/ju-picks-lobby`

## Critical fix — CI migration chain (this checkpoint)

The Supabase persistence/CI work was failing because:

1. `202508300002_jp_rpcs.sql` was a truncated placeholder and was deleted, so the
   authoritative `jp_*` RPCs and `settlement_runs` / `projection_results` /
   `contest_reward_configs` tables never existed.
2. `202508300003_persistence_hardening.sql` references `settlement_runs` and
   `jp_apply_settlement` / `jp_place_entry` -> migration apply failed.
3. Bare CI Postgres has no `auth.uid()`, `authenticated`, or `anon`, so even
   `202508300001` policies and `003`'s `jp_set_session` could not compile.

### Fix applied

- NEW `202508300000_compat.sql`: idempotently creates `authenticated`/`anon`
  roles and an `auth.uid()` shim ONLY when missing (no-op on Supabase).
- RESTORED + COMPLETED `202508300002_jp_rpcs.sql`: full `jp_*` RPCs matching the
  `scripts/db-integration.mjs` contract exactly, plus the missing tables, RLS,
  and grants. `jp_apply_settlement` is server/service_role only (not granted to
  anon/authenticated) and idempotent on `(entry_id, idempotency_key)`.

### Verification commands (run locally)

```bash
npm install
DATABASE_URL=postgres://jupicks:jupicks@localhost:5432/jupicks_dev npm run migrate
DATABASE_URL=postgres://jupicks:jupicks@localhost:5432/jupicks_dev npm run test:db
node tests/run-pure-engine.mjs
node tests/run-persistence-static.mjs
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same sequence in `.github/workflows/ci.yml` against a postgres:16 service.

## Implemented and unit-tested (pure)

- Settlement engine (HIGHER/LOWER, PUSH, VOID, PENDING, Power, Flex mixed -> config)
- Entry builder (add/remove picks, duplicate rejection, amount bounds)
- Dev-auth dual gate (production never synthetic)
- Real-money env hard gate
- Safe error mapping
- Sports provider interface + mock (dev-only)
- Settlement persistence fail-closed default

## Persistence layer (SQL + TS contracts)

| RPC | Purpose | Status |
|-----|---------|--------|
| `jp_ensure_profile` | Profile + play wallet | IMPLEMENTED |
| `jp_get_virtual_balance` | Owned balance read | IMPLEMENTED |
| `jp_get_ledger` | Owned ledger pagination | IMPLEMENTED |
| `jp_grant_starting_credit` | Once-per-(user,key), idempotent | IMPLEMENTED |
| `jp_place_entry` | Atomic stake + entry + locked picks | IMPLEMENTED |
| `jp_refund_entry` | Idempotent refund, cross-user rejected | IMPLEMENTED |
| `jp_apply_settlement` | Atomic settle + win credit / push-void refund (service only) | IMPLEMENTED |

TypeScript:
- `src/lib/db/client.ts` — fail-closed DbClient
- `src/lib/db/jp-rpc.ts` — typed RPC wrappers
- `src/lib/settlement/postgres-adapter.ts` — SettlementPersistenceAdapter

## Security

- RLS enabled on all user + reference tables.
- `jp_*` RPCs are SECURITY DEFINER with `SET search_path = public` and an
  `auth.uid()` guard: when a JWT user is present, `p_user_id` must match it;
  service_role (no JWT) is trusted server-side.
- `jp_apply_settlement` is NOT granted to anon/authenticated — server/admin only.
- No service-role credentials in source; `.env.example` lists variable names only.

## Product rules

- REAL_MONEY_ENABLED=false
- Virtual credits only (non-withdrawable)
- flexRules only (no flexTiers)
- Settlement adapter unconfigured until DbClient registered (fail-closed)

## Not yet implemented (MVP roadmap, next phases)

- Browser auth UI + Supabase client wiring (`@supabase/supabase-js`)
- Live board from provider, pick slip submission via RPCs, entries history
- Player research, JU AI EDGE, JU Rooms, friend challenges, leaderboards
- Social, notifications, admin tools, feature flags UI
- GitHub Pages deployment workflow
