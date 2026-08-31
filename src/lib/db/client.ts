/**
 * JU PICKS — Database client boundary
 * Fail-closed when DATABASE_URL / Supabase is not configured.
 * No credentials in source. Server-only.
 */

export class DbNotConfiguredError extends Error {
  readonly code = "DB_NOT_CONFIGURED";
  constructor(message = "Database is not configured") {
    super(message);
    this.name = "DbNotConfiguredError";
  }
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

/**
 * Minimal query interface. Implementations: Postgres pool, Supabase RPC wrapper.
 */
export interface DbClient {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  /**
   * Call a Postgres function / Supabase RPC by name.
   */
  rpc<T = Record<string, unknown>>(
    fn: string,
    args?: Record<string, unknown>,
  ): Promise<QueryResult<T>>;
}

let activeClient: DbClient | null = null;

export function setDbClient(client: DbClient | null): void {
  activeClient = client;
}

export function getDbClient(): DbClient {
  if (!activeClient) {
    throw new DbNotConfiguredError();
  }
  return activeClient;
}

export function isDbConfigured(): boolean {
  return activeClient !== null;
}

/**
 * True only when a real DATABASE_URL or Supabase service config is present.
 * Does not invent connections.
 */
export function hasDatabaseEnv(): boolean {
  if (typeof process === "undefined") return false;
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_URL),
  );
}
