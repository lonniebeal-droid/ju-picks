# JU PICKS — Deployment Status

## Current State: NOT YET DEPLOYED

The app is ready for deployment to GitHub Pages. The workflow exists but has not been triggered (requires merge to `main`).

## Deployment Target

- **Platform:** GitHub Pages (static SPA)
- **URL:** `https://lonniebeal-droid.github.io/ju-picks/`
- **Workflow:** `.github/workflows/deploy.yml`
- **Trigger:** Push to `main` branch

## Pre-Deployment Checklist

- [ ] User runs `npm ci && npm run lint && npm run typecheck && npm test && npm run build` locally
- [ ] All tests pass
- [ ] Lint passes (--max-warnings 0)
- [ ] Typecheck passes
- [ ] Production build succeeds
- [ ] Merge `feat/supabase-persistence` to `main`
- [ ] Enable GitHub Pages in repo settings (Source: GitHub Actions)
- [ ] Deploy workflow runs successfully
- [ ] App loads at https://lonniebeal-droid.github.io/ju-picks/

## Configuration

### Vite Base Path

`vite.config.ts` sets `base: "/ju-picks/"` when `GITHUB_ACTIONS=true` for correct asset paths on GitHub Pages project pages.

### Environment Variables (Build Time)

| Variable | Value | Purpose |
|----------|-------|---------|
| NODE_ENV | production | Vite production build |
| REAL_MONEY_ENABLED | false | Free-to-play hard gate |

### Runtime Configuration (Optional)

The app works in **demo mode** out of the box (no configuration needed).

For **connected mode** (real auth + persistence), set these Vite env vars:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

Build with: `VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run build`

**Never** use `SUPABASE_SERVICE_ROLE_KEY` in the browser.

### No Secrets in Git

- No API keys, passwords, or service-role keys in the repository
- GitHub Pages deploy uses `GITHUB_TOKEN` (automatic, no secret needed)
- Sports data uses static demo provider (no API keys)

## Architecture Notes

- Pure static SPA (no server-side runtime)
- Demo mode: localStorage for wallet/entries/ledger
- Connected mode: Supabase REST API (PostgREST + GoTrue Auth)
- Settlement in connected mode requires server-side/admin trigger (jp_apply_settlement is service_role only)
