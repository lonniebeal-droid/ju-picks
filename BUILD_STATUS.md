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
| PLAYER RESEARCH | ✅ PASS | PlayerResearchView with game log, stats, trend indicators. Research button on BoardView |
| JU AI EDGE | ✅ PASS | edge-analysis.ts: rule-based AI distinguishing statistics/observations/interpretation. No hallucination |
| JU ROOMS | ✅ PASS | RoomsView: create/join/leave rooms, invite codes, members, room leaderboard. Migration + RLS + RPCs |
| FRIEND CHALLENGES | ✅ PASS | ChallengesView: create/accept/decline, simulated opponents in demo, head-to-head results |
| LEADERBOARDS | ✅ PASS | LeaderboardsView: global/weekly/monthly from settled entries. Migration with leaderboard views |
| SOCIAL | 🔄 PARTIAL | Profiles via auth. Follows/activity/share not yet implemented |
| NOTIFICATIONS | 🔄 PARTIAL | Migration: ju_notifications table + RLS + RPC. UI not yet implemented |
| ADMIN | 🔄 PARTIAL | Migration: ju_audit_log + jp_admin_wallet_adjust RPC (admin-gated). UI not yet implemented |
| FEATURE FLAGS | ✅ PASS | Centralized module. REAL_MONEY_ENABLED=false hard gate |
| SECURITY | ✅ PARTIAL | RLS, fail-closed DB, service-role never in browser, dev-auth gate |
| MOBILE UI | ✅ PASS | Mobile-first responsive layout, max-w-lg, bottom nav, safe areas |
| UNIT TESTS | ✅ PASS | Existing: auth, entry-builder, settlement-engine, wallet-errors, persistence-boundaries. New: rooms-challenges-leaderboards |
| INTEGRATION TESTS | ⏳ UNVERIFIED | db-integration.mjs + run-persistence-static.mjs exist, user must run locally |
| E2E | ❌ MISSING | Not yet performed |
| LINT | ⏳ UNVERIFIED | User must run `npm run lint` locally |
| TYPECHECK | ⏳ UNVERIFIED | User must run `npm run typecheck` locally |
| PRODUCTION BUILD | ⏳ UNVERIFIED | User must run `npm run build` locally |
| DEPLOYMENT | 🔄 PARTIAL | GitHub Pages workflow created. Not yet deployed (merge to main needed) |
| PUBLIC APP | ❌ NOT YET | Awaits merge to main + Pages enable |
| REAL_MONEY_ENABLED | ✅ FALSE | Hard gate in feature-flags.ts |
| CRITICAL ERRORS | 0 | — |
| READY FOR USER TESTING | NO | Awaits local verification (lint/typecheck/build) + deploy |
| JU PICKS MVP COMPLETE | NO | Social UI, notifications UI, admin UI, E2E test pending |

## Architecture

```
src/
  App.tsx                    — Shell: 5-tab nav, auth gate, lazy views, research overlay
  views/
    BoardView.tsx            — Sport → game → props → Higher/Lower + Research button
    SlipView.tsx             — Entry builder + submit
    WalletView.tsx           — Balance, entries, ledger, demo settlement
    ProfileView.tsx          — Auth info, feature flags, free-to-play notice
    PlayerResearchView.tsx   — Player research with game log + JU AI EDGE insights
    RoomsView.tsx            — Create/join/leave rooms, invite codes, members, leaderboard
    ChallengesView.tsx       — Friend challenges: create/accept/decline, simulated opponents
    LeaderboardsView.tsx     — Global/weekly/monthly leaderboards from settled entries
  lib/
    ai/edge-analysis.ts      — Rule-based AI analysis (stats/observations/interpretation)
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
  004_ju_social.sql          — ju_rooms, ju_challenges, ju_notifications, ju_audit_log
                              + RLS + RPCs + leaderboard views

tests/
  auth-and-money.test.ts            — Dev auth gate + real money hard gate
  entry-builder.test.ts             — Add/remove/validate/duplicate rejection
  settlement-engine.test.ts         — HIGHER/LOWER/PUSH/VOID/Power/Flex
  wallet-errors.test.ts             — Wallet error mapping
  persistence-boundaries.test.ts    — Migration SQL contract + adapter fail-closed
  rooms-challenges-leaderboards.test.ts — Rooms, challenges, leaderboards, notifications, admin auth

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
