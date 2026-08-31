# JU PICKS — Test Results

## Status: PENDING LOCAL VERIFICATION

The sandbox environment does not have node/npm/tsc/eslint. All tests must be run locally by the user.

## How to Run

```bash
# Install dependencies
npm ci

# Apply migrations (requires local Postgres or Supabase)
# Set DATABASE_URL in .env or environment
npm run migrate

# Run all test suites
npm test                    # vitest unit tests
npm run test:pure          # pure engine tests (no DB)
npm run test:static        # persistence static contract tests
npm run test:db            # database integration tests (requires DATABASE_URL)
npm run test:all-offline   # pure + static (no DB needed)

# Quality checks
npm run lint               # eslint --max-warnings 0
npm run typecheck          # tsc --noEmit
npm run build              # production build (tsc + vite)
```

## Expected Test Suites

### Unit Tests (vitest) — `npm test`

| Suite | File | Status |
|-------|------|--------|
| Auth & Money | tests/auth-and-money.test.ts | ✅ Existing (should pass) |
| Entry Builder | tests/entry-builder.test.ts | ✅ Existing (should pass) |
| Settlement Engine | tests/settlement-engine.test.ts | ✅ Existing (should pass) |
| Wallet Errors | tests/wallet-errors.test.ts | ✅ Existing (should pass) |
| Persistence Boundaries | tests/persistence-boundaries.test.ts | ✅ Existing — checks migration SQL contracts |

### Pure Engine Tests — `npm run test:pure`

Standalone Node script. Tests settlement engine, entry builder, wallet errors without vitest or DB.

### Persistence Static Tests — `npm run test:static`

Checks migration SQL files for required substrings (function names, grants, idempotency, etc.).
No database required.

### Database Integration Tests — `npm run test:db`

Requires DATABASE_URL set. Tests full RPC flow:
- Starting credit (idempotent)
- Entry placement (validation, duplicate rejection, insufficient funds)
- Refund (idempotent, cross-user rejection)
- Settlement (WIN/LOSS/PUSH, idempotent replay, double-settlement protection)
- Cross-user isolation

If DATABASE_URL is not set and CI is false, exits 0 with SKIP message.

## Known Issues to Watch

1. **package-lock.json**: If `@supabase/supabase-js` or other new deps were added, `npm ci` may fail without lockfile update. Current code uses fetch-based Supabase client (no new deps).

2. **import.meta.env**: The Supabase client uses `import.meta.env` (Vite). Typecheck should pass via `vite/client` types. Tests import lib modules directly, not the Supabase client.

3. **Lazy imports**: App.tsx uses `lazy(() => import("~/views/*"))`. Typecheck needs to resolve these paths. Vite config and tsconfig both alias `~` to `src/`.

## CI Configuration

GitHub Actions CI runs on push to `main` and `feat/**`:
1. npm ci
2. Apply migrations (Postgres 16 service)
3. Pure engine tests
4. Persistence static tests
5. Database integration tests
6. Lint (--max-warnings 0)
7. Typecheck
8. Unit tests (vitest)
9. Production build

All steps must pass for green CI.
