# JU PICKS — Build Status

## Checkpoint

- Base: `ccdaebc` (MVP foundation)
- Persistence branch: `feat/supabase-persistence` @ `7976735`

## Implemented and unit-tested (pure)

- Settlement engine (HIGHER/LOWER, PUSH, VOID, PENDING, Power, Flex mixed → config)
- Entry builder (add/remove picks, duplicate rejection, amount bounds)
- Dev-auth dual gate (production never synthetic)
- Real-money env hard gate
- Safe error mapping
- Sports provider interface + mock (dev-only)
- Settlement persistence fail-closed default

## Persistence layer (SQL + TS contracts)

Migration `202508300002_jp_rpcs.sql`:

| RPC | Purpose |
|-----|---------|
| `jp_ensure_profile` | Profile + play wallet |
| `jp_get_virtual_balance` | Owned balance read |
| `jp_get_ledger` | Owned ledger pagination |
| `jp_grant_starting_credit` | Once-per-wallet, idempotent |
| `jp_place_entry` | Atomic stake + entry + locked picks |
| `jp_refund_entry` | Idempotent refund from entry amount |
| `jp_apply_settlement` | Atomic settle + win credit / push-void refund (service_role) |

TypeScript:

- `src/lib/db/client.ts` — fail-closed DbClient
- `src/lib/db/jp-rpc.ts` — typed RPC wrappers
- `src/lib/settlement/postgres-adapter.ts` — SettlementPersistenceAdapter

## Fail-closed / not live-verified

- Live Supabase project / local Postgres apply
- DATABASE_URL wiring
- Full vitest (npm registry blocked)
- lint / typecheck / production build

## Product rules

- REAL_MONEY_ENABLED=false
- Virtual credits only
- flexRules only (no flexTiers)
- Settlement adapter unconfigured until DbClient registered
