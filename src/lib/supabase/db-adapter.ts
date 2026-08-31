/**
 * JU PICKS — Supabase-backed DbClient adapter
 * Bridges the Supabase fetch client to the DbClient interface
 * so jp-rpc.ts wrappers work in the browser.
 */

import type { DbClient, QueryResult } from "../db/client";
import { setDbClient } from "../db/client";
import { supabaseRpc, supabaseSelect, isSupabaseConfigured } from "./client";

export class SupabaseDbClient implements DbClient {
  async query<T = Record<string, unknown>>(
    _sql: string,
    _params?: unknown[],
  ): Promise<QueryResult<T>> {
    throw new Error(
      "Raw SQL queries are not supported in the browser. Use rpc() instead.",
    );
  }

  async rpc<T = Record<string, unknown>>(
    fn: string,
    args: Record<string, unknown> = {},
  ): Promise<QueryResult<T>> {
    return supabaseRpc<T>(fn, args);
  }
}

let registered = false;

/**
 * Register the Supabase DbClient when configured.
 * Called once on app init.
 */
export function registerSupabaseDbClient(): boolean {
  if (registered) return true;
  if (!isSupabaseConfigured()) return false;
  setDbClient(new SupabaseDbClient());
  registered = true;
  return true;
}

/**
 * Browser-safe select helper (for tables, not RPCs).
 */
export async function browserSelect<T = Record<string, unknown>>(
  table: string,
  query?: string,
  filters?: Record<string, string>,
): Promise<{ rows: T[]; rowCount: number }> {
  return supabaseSelect<T>(table, query, filters);
}
