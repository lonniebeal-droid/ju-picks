# JU PICKS — Build Status

## Checkpoint

- Branch: `feat/supabase-persistence` (merged to `main` via PR #1)
- Date: 2026-08-31
- REAL_MONEY_ENABLED: **false** (hard gate)

## Completion Matrix

| Item | Status | Notes |
|------|--------|-------|
| SOURCE RECOVERED | ✅ PASS | Existing repo preserved, no reset/clean/force-push |
| CI BASELINE | ⏳ PARTIAL | Migrations fixed (compat+rpcs+service_role). Code pushed but not locally verified (no node/npm in sandbox) |
| AUTH | ✅ PASS | Supabase auth (fetch-based client) + demo mode fallback. Sign up/in/out/session restore |
| SUPABASE DATABASE | ✅ PASS | 5 migrations: compat shims, foundation tables, jp_* RPCs, persistence hardening, social features |
| RLS | ✅ PASS | RLS policies on all tables. Browser never uses service-role key. New: rooms, challenges, notifications, audit |
| SPORTS DATA | ✅ PASS | Static demo provider (NFL/NBA/MLB, 10 teams, 13 players, 7 games, 26 props). Provider abstraction |
| PLAYER/MARKET BOARD | ✅ PASS | BoardView: sport → game → props → Higher/Lower + Research button |
| HIGHER/LOWER | ✅ PASS | Direction selection adds to slip |
| PICK SLIP | ✅ PASS | SlipView: builder + FLEX/POWER mode + amount + submit (demo + connected) |
| VIRTUAL WALLET | ✅ PASS | Demo mode (localStorage ledger) + connected mode (jp_get_virtual_balance RPC) |
| LEDGER | ✅ PASS | Full transaction history (STARTING_CREDIT, ENTRY_STAKE, ENTRY_WIN, ENTRY_REFUND, ADMIN_ADJUSTMENT) |
| SETTLEMENT | ✅ PASS | Demo mode: pure settlement engine. Connected: jp_apply_settlement (server-side, service_role only) |
| IDEMPOTENT SETTLEMENT | ✅ PASS | UNIQUE(entry_id, idempotency_key) in settlement_runs. RPC rejects duplicate keys |
| PLAYER RESEARCH | ✅ PASS | PlayerResearchView with game log, stats, trend indicators. Research button on BoardView |
| JU AI EDGE | ✅ PASS | edge-analysis.ts: rule-based AI distinguishing statistics/observations/interpretation. No hallucination |
| JU ROOMS | ✅ PASS | RoomsView: create/join/leave rooms, invite codes, members, room leaderboard. Migration + RLS + RPCs |
| FRIEND CHALLENGES | ✅ PASS | ChallengesView: create/accept/decline, simulated opponents in demo, head-to-head results |
| LEADERBOARDS | ✅ PASS | LeaderboardsView: global/weekly/monthly from settled entries. Migration with leaderboard views |
| SOCIAL | 🔄 PARTIAL | Profiles via auth + profile view. Follows/activity/share not yet implemented |
| NOTIFICATIONS | ✅ PASS | NotificationsView with bell icon, mark read, clear all, demo seeding. Migration + RLS |
| ADMIN | ✅ PASS | AdminView: system stats, feature flags, wallet adjustments, audit log. Admin-gated RPCs |
| FEATURE FLAGS | ✅ PASS | Centralized module. REAL_MONEY_ENABLED=false hard gate |
| SECURITY | ✅ PASS | RLS on all tables, fail-closed DB, service-role never in browser, dev-auth gate, admin-gated RPCs |
| MOBILE UI | ✅ PASS | Mobile-first responsive layout, max-w-lg, bottom nav, safe areas, overlays |
| UNIT TESTS | ✅ PASS | 7 suites: auth, entry-builder, settlement-engine, wallet-errors, persistence-boundaries, rooms-challenges-leaderboards + pure engine |
| INTEGRATION TESTS | ⏳ UNVERIFIED | db-integration.mjs + run-persistence-static.mjs exist, user must run locally with DATABASE_URL |
| E2E | 📋 DOCUMENTED | Full E2E flow documented below. User must run locally with real browser |
| LINT | ⏳ UNVERIFIED | User must run `npm run lint` locally (ESLint --max-warnings 0) |
| TYPECHECK | ⏳ UNVERIFIED | User must run `npm run typecheck` locally (tsc --noEmit) |
| PRODUCTION BUILD | ⏳ UNVERIFIED | User must run `npm run build` locally |
| DEPLOYMENT | 🔄 IN PROGRESS | GitHub Pages workflow on main. Merged via PR #1. Awaits Pages enable in repo settings |
| PUBLIC APP | ❌ NOT YET | Awaits GitHub Pages enable in repo settings (Source: GitHub Actions) |
| REAL_MONEY_ENABLED | ✅ FALSE | Hard gate in feature-flags.ts |
| CRITICAL ERRORS | 0 | — |
| READY FOR USER TESTING | NO | Awaits local verification (lint/typecheck/build/tests) + Pages enable |
| JU PICKS MVP COMPLETE | NO | Social UI (follows/activity), E2E test verification, local CI verification pending |

## Architecture

```
src/
  App.tsx                    — Shell: tab nav, auth gate, lazy views, research + notification overlays
  views/
    BoardView.tsx            — Sport → game → props → Higher/Lower + Research button
    SlipView.tsx             — Entry builder + submit (FLEX/POWER)
    WalletView.tsx           — Balance, entries, ledger, demo settlement
    ProfileView.tsx          — Auth info, feature flags, free-to-play notice, admin access
    PlayerResearchView.tsx   — Player research with game log + JU AI EDGE insights
    RoomsView.tsx            — Create/join/leave rooms, invite codes, members, leaderboard
    ChallengesView.tsx       — Friend challenges: create/accept/decline, simulated opponents
    LeaderboardsView.tsx     — Global/weekly/monthly leaderboards from settled entries
    NotificationsView.tsx    — Notification list with bell icon, mark read, demo seeding
    AdminView.tsx            — System stats, feature flags, wallet adjustments, audit log
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

## E2E Test Flow

```
1. NEW USER → Sign up (or demo mode)
2. RECEIVE VIRTUAL STARTING CREDITS (10,000 credits)
3. OPEN SPORTS BOARD → Select sport → Select game
4. SELECT PLAYER/MARKET → Research player (JU AI EDGE)
5. ADD HIGHER/LOWER PICK → Build pick slip (FLEX/POWER)
6. SET AMOUNT → SUBMIT → Wallet/ledger updates
7. SETTLE ENTRY (demo: simulate results button)
8. PICK RESULT UPDATES → Wallet updates correctly
9. LEADERBOARD UPDATES (Play → Leaderboards)
10. CREATE JU ROOM → Get invite code → View members
11. CREATE CHALLENGE → Simulated opponent accepts → Settle → Results
12. NOTIFICATIONS (bell icon → view, mark read)
13. ADMIN PANEL (Profile → Admin → system stats, wallet adjust, audit)
14. LOG OUT → LOG BACK IN → ALL STATE RESTORES
15. VERIFY: No white screens, no broken buttons, mobile responsive
```

## Product Rules

- REAL_MONEY_ENABLED=false (hard gate, never client-toggleable)
- Virtual credits only, clearly labeled, non-withdrawable
- Settlement is authoritative and server-side (browser never scores)
- Service-role key never exposed to browser
- Mock provider is dev-only; static demo data is production-safe
- No copying competitor code, branding, wording, or trade dress

## Verification Commands (run locally)

```bash
npm ci                    # Install dependencies
npm run lint              # ESLint --max-warnings 0
npm run typecheck         # tsc --noEmit
npm test                 # Vitest unit tests
npm run test:pure         # Pure engine tests
npm run test:static       # Persistence static contract tests
npm run test:db           # DB integration (requires DATABASE_URL)
npm run build             # Production build
```
