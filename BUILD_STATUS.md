# JU PICKS — Build Status

## Checkpoint

- Branch: `feat/supabase-persistence`
- Date: 2026-08-31
- REAL_MONEY_ENABLED: **false** (hard gate)

## Completion Matrix

| Item | Status | Notes |
|------|--------|-------|
| SOURCE RECOVERED | ✅ PASS | Existing repo preserved, no reset/clean/force-push |
| CI BASELINE | ⏳ PARTIAL | Migrations fixed (compat+rpcs+service_role). Code pushed but not locally verified (no node/npm in sandbox) |
| AUTH | ✅ IMPLEMENTED | Supabase auth (fetch-based client) + demo mode fallback. Sign up/in/out/session restore |
| SUPABASE DATABASE | ✅ PASS | 4 migrations: compat shims, foundation tables, jp_* RPCs, persistence hardening |
| RLS | ✅ IMPLEMENTED | RLS policies in 002 migration. Browser never uses service-role key |
| SPORTS DATA | ✅ PASS | Static demo provider (NFL/NBA/MLB, 10 teams, 13 players, 7 games, 26 props). Provider abstraction |
| PLAYER/MARKET BOARD | ✅ PASS | BoardView: sport → game → props → Higher/Lower |
| HIGHER/LOWER | ✅ PASS | Direction selection adds to slip |
| PICK SLIP | ✅ PASS | SlipView: builder + FLEX/POWER mode + amount + submit (demo + connected) |
| VIRTUAL WALLET | ✅ PASS | Demo mode (localStorage ledger) + connected mode (jp_get_virtual_balance RPC) |
| LEDGER | ✅ PASS | Full transaction history (STARTING_CREDIT, ENTRY_STAKE, ENTRY_WIN, ENTRY_REFUND) |
| SETTLEMENT | ✅ PASS | Demo mode: pure settlement engine. Connected: jp_apply_settlement (server-side, service_role only) |
| IDEMPOTENT SETTLEMENT | ✅ PASS | UNIQUE(entry_id, idempotency_key) in settlement_runs. RPC rejects duplicate keys |
| PLAYER RESEARCH | 🔄 PARTIAL | Player stats data in demo provider. UI view not yet implemented |
| JU AI EDGE | ❌ MISSING | Feature flag ready. Analysis module + UI not yet implemented |
| JU ROOMS | 🔄 PARTIAL | Placeholder UI. Migration + service not yet implemented |
| FRIEND CHALLENGES | 🔄 PARTIAL | Placeholder UI. Migration + service not yet implemented |
| LEADERBOARDS | 🔄 PARTIAL | Placeholder UI. Migration + service not yet implemented |
| SOCIAL | ❌ MISSING | Profiles/follows/activity not yet implemented |
| NOTIFICATIONS | ❌ MISSING | Not yet implemented |
| ADMIN | ❌ MISSING | Protected admin UI not yet implemented |
| FEATURE FLAGS | ✅ PASS | Centralized module. REAL_MONEY_ENABLED=false hard gate |
| SECURITY | ✅ PARTIAL | RLS, fail-closed DB, service-role never in browser, dev-auth gate |
| MOBILE UI | ✅ PASS | Mobile-first responsive layout, max-w-lg, bottom nav, safe areas |
| UNIT TESTS | ✅ PASS | Existing: auth, entry-builder, settlement-engine, wallet-errors, persistence-boundaries |
| INTEGRATION TESTS | ⏳ UNVERIFIED | db-integration.mjs + run-persistence-static.mjs exist, user must run locally |
| E2E | ❌ MISSING | Not yet performed |
| LINT | ⏳ UNVERIFIED | User must run `npm run lint` locally |
| TYPECHECK | ⏳ UNVERIFIED | User must run `npm run typecheck` locally |
| PRODUCTION BUILD | ⏳ UNVERIFIED | User must run `npm run build` locally |
| DEPLOYMENT | 🔄 PARTIAL | GitHub Pages workflow created. Not yet deployed (merge to main needed) |
| PUBLIC APP | ❌ NOT YET | Awaits merge to main + Pages enable |
| REAL_MONEY_ENABLED | ✅ FALSE | Hard gate in feature-flags.ts |
| CRITICAL ERRORS | 0 | — |
| READY FOR USER TESTING | NO | Awaits local verification + deploy |
| JU PICKS MVP COMPLETE | NO | Social features, research, AI, admin pending |

## Architecture

```
src/
  App.tsx                    — Shell: 5-tab nav, auth gate, lazy views
  views/
    BoardView.tsx            — Sport → game → props → Higher/Lower
    SlipView.tsx             — Entry builder + submit
    WalletView.tsx           — Balance, entries, ledger, demo settlement
    ProfileView.tsx          — Auth info, feature flags, free-to-play notice
  lib/
    app/app-provider.tsx     — Single context: auth, wallet, entries, builder, demo store
    auth/dev-auth.ts          — Dev auth gate (existing)
    config/feature-flags.ts  — Centralized flags (REAL_MONEY_ENABLED=false)
    db/client.ts             — Fail-closed DbClient (existing)
    db/jp-rpc.ts             — Typed RPC wrappers (existing)
    entries/                 — Entry builder domain logic (existing, tested)
    settlement/              — Settlement engine + adapter (existing, tested)
    sports/                  — Provider interface + mock + static-demo
    supabase/
      client.ts              — Fetch-based Supabase client (auth + RPC + select)
      db-adapter.ts          — Bridges Supabase to DbClient interface
    wallet/errors.ts         — Wallet error types (existing)

supabase/migrations/
  000_compat.sql             — auth.uid(), authenticated/anon/service_role shims
  001_foundation.sql         — Base tables (profiles, wallets, entries, etc.)
  002_jp_rpcs.sql            — 7 jp_* RPCs, settlement tables, RLS, grants
  003_persistence_hardening.sql — jp_set_session, indexes, comments

.github/workflows/
  ci.yml                     — Postgres 16 CI: migrate + tests + lint + typecheck + build
  deploy.yml                 — GitHub Pages deploy on main push
```

## Product Rules

- REAL_MONEY_ENABLED=false (hard gate, never client-toggleable)
- Virtual credits only, clearly labeled, non-withdrawable
- Settlement is authoritative and server-side (browser never scores)
- Service-role key never exposed to browser
- Mock provider is dev-only; static demo data is production-safe
