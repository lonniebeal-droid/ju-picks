/**
 * JU PICKS — Lightweight Supabase client (fetch-based)
 * No @supabase/supabase-js dependency required.
 * Uses PostgREST + GoTrue Auth APIs directly.
 *
 * Browser-only. Server-side uses pg (scripts/db-integration.mjs).
 * Service-role key is NEVER used in the browser.
 */

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  created_at: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SupabaseUser;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedConfig: SupabaseConfig | null | undefined;

export function getSupabaseConfig(): SupabaseConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;
  const env = (typeof import.meta !== "undefined" ? import.meta.env : {}) as Record<string, string | undefined>;
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  cachedConfig = url && anonKey ? { url, anonKey } : null;
  return cachedConfig;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

const TOKEN_KEY = "jp_supabase_token";
const REFRESH_KEY = "jp_supabase_refresh";

function headers(anonKey: string, token?: string): HeadersInit {
  const h: Record<string, string> = {
    apikey: anonKey,
    "Content-Type": "application/json",
  };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

export async function supabaseSignUp(
  email: string,
  password: string,
): Promise<SupabaseSession> {
  const cfg = getSupabaseConfig();
  if (!cfg) throw new Error("Supabase not configured");
  const res = await fetch(cfg.url + "/auth/v1/signup", {
    method: "POST",
    headers: headers(cfg.anonKey),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.msg || body.message || "Sign up failed");
  }
  const data = await res.json();
  if (!data.access_token) {
    // Email confirmation may be required
    if (data.user && !data.session) {
      throw new Error("Check your email to confirm your account, then sign in.");
    }
    throw new Error("Sign up incomplete");
  }
  const session = extractSession(data);
  persistSession(session);
  return session;
}

export async function supabaseSignIn(
  email: string,
  password: string,
): Promise<SupabaseSession> {
  const cfg = getSupabaseConfig();
  if (!cfg) throw new Error("Supabase not configured");
  const res = await fetch(cfg.url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: headers(cfg.anonKey),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.msg || body.message || "Sign in failed");
  }
  const data = await res.json();
  const session = extractSession(data);
  persistSession(session);
  return session;
}

export async function supabaseSignOut(): Promise<void> {
  const cfg = getSupabaseConfig();
  const token = getStoredToken();
  if (cfg && token) {
    await fetch(cfg.url + "/auth/v1/logout", {
      method: "POST",
      headers: headers(cfg.anonKey, token),
    }).catch(() => {});
  }
  clearSession();
}

export async function supabaseGetUser(): Promise<SupabaseUser | null> {
  const cfg = getSupabaseConfig();
  const token = getStoredToken();
  if (!cfg || !token) return null;
  const res = await fetch(cfg.url + "/auth/v1/user", {
    headers: headers(cfg.anonKey, token),
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  return await res.json();
}

export async function supabaseRefresh(): Promise<SupabaseSession | null> {
  const cfg = getSupabaseConfig();
  const refresh = getStoredRefresh();
  if (!cfg || !refresh) return null;
  const res = await fetch(cfg.url + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: headers(cfg.anonKey),
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const data = await res.json();
  const session = extractSession(data);
  persistSession(session);
  return session;
}

/**
 * Call a Postgres function via PostgREST RPC.
 */
export async function supabaseRpc<T = Record<string, unknown>>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<{ rows: T[]; rowCount: number }> {
  const cfg = getSupabaseConfig();
  const token = getStoredToken();
  if (!cfg) throw new Error("Supabase not configured");
  const res = await fetch(cfg.url + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: {
      ...headers(cfg.anonKey, token ?? undefined),
      "Content-Profile": "public",
      Accept: "application/vnd.pgrst.object+json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "RPC " + fn + " failed (" + res.status + ")");
  }
  // PostgREST returns a single JSON object for scalar-returning functions
  // and an array for set-returning functions.
  const raw = await res.json();
  const rows: T[] = Array.isArray(raw) ? raw : [raw];
  return { rows, rowCount: rows.length };
}

/**
 * Select rows from a table via PostgREST.
 */
export async function supabaseSelect<T = Record<string, unknown>>(
  table: string,
  query: string = "*",
  filters: Record<string, string> = {},
): Promise<{ rows: T[]; rowCount: number }> {
  const cfg = getSupabaseConfig();
  const token = getStoredToken();
  if (!cfg) throw new Error("Supabase not configured");
  let url = cfg.url + "/rest/v1/" + table + "?select=" + encodeURIComponent(query);
  for (const [k, v] of Object.entries(filters)) {
    url += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(v);
  }
  const res = await fetch(url, {
    headers: headers(cfg.anonKey, token ?? undefined),
  });
  if (!res.ok) {
    throw new Error("Select " + table + " failed (" + res.status + ")");
  }
  const rows: T[] = await res.json();
  return { rows, rowCount: rows.length };
}

// ─── Session persistence ─────────────────────────────────
function extractSession(data: Record<string, unknown>): SupabaseSession {
  const user = (data.user ?? {}) as SupabaseUser;
  if (!user.id && data.user_id) user.id = data.user_id as string;
  if (!user.email && data.email) user.email = data.email as string;
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_at: data.expires_at ? (data.expires_at as number) : Date.now() + 3600_000,
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata ?? {},
      created_at: user.created_at ?? new Date().toISOString(),
    },
  };
}

function persistSession(session: SupabaseSession): void {
  try {
    localStorage.setItem(TOKEN_KEY, session.access_token);
    localStorage.setItem(REFRESH_KEY, session.refresh_token);
  } catch { /* SSR or no localStorage */ }
}

function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch { /* ignore */ }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredRefresh(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}
