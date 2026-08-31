# JU PICKS — Session safety

## Rule

Authenticated identity is **`auth.uid()` from the JWT**, not a connection-scoped GUC.

## Why

Pooled connections (Supabase pooler, PgBouncer) reuse physical connections across HTTP requests. A session GUC set with `is_local = false` can leak User A’s identity into User B’s request.

## What we do

1. All `jp_*` RPCs call `auth.uid()` (or require service_role for settlement).
2. `jp_set_session()` only:
   - verifies `auth.uid()` is present
   - sets `jupicks.uid` with **`set_config(..., is_local := true)`** (transaction-scoped)
3. Browser clients never pass authoritative `userId` / `role`.
4. `jp_apply_settlement` is granted to **`service_role` only**.

## What we never do

- Store user id on the connection for the lifetime of the pool client
- Trust `userId` from request body as ownership proof
- Expose service-role keys to the browser
