# JU PICKS

Free-to-play sports prediction platform. **Virtual credits only.**

- No deposits
- No withdrawals
- No cash wagering
- No real-money prizes
- `REAL_MONEY_ENABLED=false`

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Zod validation
- Vitest
- Supabase PostgreSQL (migrations under `supabase/migrations`)

## Quick start

```bash
cp .env.example .env
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

## Offline tests

```bash
npm run test:pure
npm run test:static
```

## CI

GitHub Actions runs Postgres service, migrations, integration tests, lint, typecheck, unit tests, and build.

## Status

See [BUILD_STATUS.md](./BUILD_STATUS.md).
