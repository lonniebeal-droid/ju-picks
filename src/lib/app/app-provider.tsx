/**
 * JU PICKS — App provider: auth, wallet, entries, demo mode
 * Single React context that manages all app state.
 * Demo mode (localStorage) when Supabase not configured.
 * Connected mode (RPCs) when Supabase is configured.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabaseSignUp, supabaseSignIn, supabaseSignOut, supabaseGetUser, supabaseRefresh, getStoredToken } from "../supabase/client";
import { registerSupabaseDbClient } from "../supabase/db-adapter";
import { isDbConfigured } from "../db/client";
import { getFeatureFlags, getStartingCredits } from "../config/feature-flags";
import { settlePick, summarizePickOutcomes, determinePowerOutcome, determineFlexOutcome } from "../settlement/engine";
import type { PickOutcome } from "../settlement/types";

// ─── Types ───────────────────────────────────────────────
export interface AppUser {
  id: string;
  email: string;
  name: string;
}

export interface LedgerEntry {
  id: string;
  type: string;
  amountCents: number;
  balanceAfterCents: number;
  entryId: string | null;
  reason: string | null;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface EntryPick {
  projectionId: string;
  direction: "HIGHER" | "LOWER";
  playerName: string | null;
  statType: string | null;
  line: number | null;
  lockedLine: number | null;
  outcome: string | null;
  actualValue: number | null;
}

export interface AppEntry {
  entryId: string;
  status: "open" | "locked" | "settled" | "void" | "cancelled";
  mode: "FLEX" | "POWER";
  entryAmountCents: number;
  powerMode: boolean;
  createdAt: string;
  picks: EntryPick[];
  outcome: string | null;
  rewardCreditsCents: number | null;
  settlementVersion: number;
}

export interface BuilderPick {
  projectionId: string;
  direction: "HIGHER" | "LOWER";
  playerName: string;
  statType: string;
  line: number;
}

interface AppContextValue {
  // Auth
  user: AppUser | null;
  isLoading: boolean;
  isDemoMode: boolean;
  isDbConnected: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Wallet
  balanceCredits: number;
  ledger: LedgerEntry[];
  refreshWallet: () => Promise<void>;

  // Entries
  entries: AppEntry[];
  refreshEntries: () => Promise<void>;

  // Entry builder
  builderPicks: BuilderPick[];
  builderMode: "FLEX" | "POWER";
  builderAmount: number;
  addBuilderPick: (pick: BuilderPick) => void;
  removeBuilderPick: (projectionId: string) => void;
  setBuilderMode: (mode: "FLEX" | "POWER") => void;
  setBuilderAmount: (amount: number) => void;
  clearBuilder: () => void;
  submitEntry: (contestTypeId: string) => Promise<{ success: boolean; error?: string; entryId?: string }>;

  // Settlement (demo mode only)
  settleDemoEntry: (entryId: string, outcomes: Array<{ projectionId: string; actualValue: number; isFinal: boolean; isVoid: boolean }>) => void;

  // Feature flags
  flags: ReturnType<typeof getFeatureFlags>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ─── Demo store (localStorage) ────────────────────────────
const DEMO_WALLET_KEY = "jp_demo_wallet";
const DEMO_LEDGER_KEY = "jp_demo_ledger";
const DEMO_ENTRIES_KEY = "jp_demo_entries";

interface DemoWalletState {
  balanceCents: number;
  startingCreditGranted: boolean;
}

function loadDemoWallet(): DemoWalletState {
  try {
    const raw = localStorage.getItem(DEMO_WALLET_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { balanceCents: 0, startingCreditGranted: false };
}

function saveDemoWallet(w: DemoWalletState): void {
  try { localStorage.setItem(DEMO_WALLET_KEY, JSON.stringify(w)); } catch { /* ignore */ }
}

function loadDemoLedger(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(DEMO_LEDGER_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveDemoLedger(l: LedgerEntry[]): void {
  try { localStorage.setItem(DEMO_LEDGER_KEY, JSON.stringify(l)); } catch { /* ignore */ }
}

function loadDemoEntries(): AppEntry[] {
  try {
    const raw = localStorage.getItem(DEMO_ENTRIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveDemoEntries(e: AppEntry[]): void {
  try { localStorage.setItem(DEMO_ENTRIES_KEY, JSON.stringify(e)); } catch { /* ignore */ }
}

function uid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── App Provider ────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const flags = useMemo(() => getFeatureFlags(), []);
  const supabaseOn = isSupabaseConfigured();

  // Auth state
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wallet state
  const [balanceCredits, setBalanceCredits] = useState(0);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  // Entries state
  const [entries, setEntries] = useState<AppEntry[]>([]);

  // Entry builder state
  const [builderPicks, setBuilderPicks] = useState<BuilderPick[]>([]);
  const [builderMode, setBuilderMode] = useState<"FLEX" | "POWER">("FLEX");
  const [builderAmount, setBuilderAmount] = useState(0);

  const isDemoMode = !supabaseOn;
  const isDbConnected = supabaseOn && isDbConfigured();

  // ─── Init: register Supabase, restore session, grant demo credits ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (supabaseOn) {
        registerSupabaseDbClient();
        // Try to restore Supabase session
        const token = getStoredToken();
        if (token) {
          const sbUser = await supabaseGetUser();
          if (sbUser && !cancelled) {
            setUser({
              id: sbUser.id,
              email: sbUser.email,
              name: (sbUser.user_metadata?.name as string) || sbUser.email,
            });
            setIsLoading(false);
            return;
          }
          // Token expired — try refresh
          const session = await supabaseRefresh();
          if (session && !cancelled) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              name: (session.user.user_metadata?.name as string) || session.user.email,
            });
            setIsLoading(false);
            return;
          }
        }
        setIsLoading(false);
      } else {
        // Demo mode — auto-login as demo user
        const demoUser: AppUser = {
          id: "demo-user",
          email: "demo@jupicks.local",
          name: "Demo Player",
        };
        if (!cancelled) {
          setUser(demoUser);
          setIsLoading(false);

          // Grant starting credits if not already granted
          const wallet = loadDemoWallet();
          if (!wallet.startingCreditGranted) {
            const startCents = getStartingCredits() * 100;
            const newWallet: DemoWalletState = {
              balanceCents: startCents,
              startingCreditGranted: true,
            };
            saveDemoWallet(newWallet);
            const startLedger: LedgerEntry = {
              id: uid(),
              type: "STARTING_CREDIT",
              amountCents: startCents,
              balanceAfterCents: startCents,
              entryId: null,
              reason: "Welcome to JU PICKS — free virtual credits",
              idempotencyKey: "starting-credit-v1",
              createdAt: new Date().toISOString(),
            };
            const newLedger = [startLedger];
            saveDemoLedger(newLedger);
          }

          // Load demo state
          refreshDemoState();
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ─── Demo state refresh ─────────────────────────────────
  function refreshDemoState() {
    const wallet = loadDemoWallet();
    setBalanceCredits(Math.floor(wallet.balanceCents / 100));
    setLedger(loadDemoLedger());
    setEntries(loadDemoEntries());
  }

  // ─── Connected state refresh ─────────────────────────────
  const refreshWallet = useCallback(async () => {
    if (!supabaseOn) {
      refreshDemoState();
      return;
    }
    try {
      const { jpGetVirtualBalance, jpGetLedger } = await import("../db/jp-rpc");
      const bal = await jpGetVirtualBalance();
      setBalanceCredits(Math.floor(bal.balance_cents / 100));
      const led = await jpGetLedger(50, 0);
      setLedger(led.map((r) => ({
        id: r.id,
        type: r.type,
        amountCents: r.amount_cents,
        balanceAfterCents: r.balance_after_cents,
        entryId: r.entry_id ?? null,
        reason: r.reason ?? null,
        idempotencyKey: r.idempotency_key ?? null,
        createdAt: r.created_at,
      })));
    } catch (err) {
      console.error("refreshWallet failed:", err);
    }
  }, [supabaseOn]);

  const refreshEntries = useCallback(async () => {
    if (!supabaseOn) {
      setEntries(loadDemoEntries());
      return;
    }
    // In connected mode, entries are fetched via table select
    // (no jp_get_entries RPC yet; use supabaseSelect)
    try {
      const { browserSelect } = await import("../supabase/db-adapter");
      const result = await browserSelect<{
        entry_id: string; status: string; power_mode: boolean;
        entry_amount_cents: string; created_at: string;
      }>("entries", "entry_id,status,power_mode,entry_amount_cents,created_at", {});
      const entryRows = result.rows;
      const fullEntries: AppEntry[] = [];
      for (const row of entryRows) {
        const picksResult = await browserSelect<{
          projection_id: string; direction: string; locked_line: string;
        }>("entry_picks", "projection_id,direction,locked_line", { entry_id: "eq." + row.entry_id });
        fullEntries.push({
          entryId: row.entry_id,
          status: row.status as AppEntry["status"],
          mode: row.power_mode ? "POWER" : "FLEX",
          entryAmountCents: parseInt(row.entry_amount_cents, 10),
          powerMode: row.power_mode,
          createdAt: row.created_at,
          picks: picksResult.rows.map((p) => ({
            projectionId: p.projection_id,
            direction: p.direction as "HIGHER" | "LOWER",
            playerName: null,
            statType: null,
            line: null,
            lockedLine: parseFloat(p.locked_line),
            outcome: null,
            actualValue: null,
          })),
          outcome: null,
          rewardCreditsCents: null,
          settlementVersion: 0,
        });
      }
      setEntries(fullEntries);
    } catch (err) {
      console.error("refreshEntries failed:", err);
    }
  }, [supabaseOn]);

  // ─── Auth ───────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabaseOn) throw new Error("Sign up requires Supabase configuration");
    const session = await supabaseSignUp(email, password);
    setUser({
      id: session.user.id,
      email: session.user.email,
      name: (session.user.user_metadata?.name as string) || session.user.email,
    });
  }, [supabaseOn]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseOn) throw new Error("Sign in requires Supabase configuration");
    const session = await supabaseSignIn(email, password);
    setUser({
      id: session.user.id,
      email: session.user.email,
      name: (session.user.user_metadata?.name as string) || session.user.email,
    });
  }, [supabaseOn]);

  const signOut = useCallback(async () => {
    if (supabaseOn) {
      await supabaseSignOut();
      setUser(null);
    } else {
      // Demo mode: just clear and re-init
      setUser({
        id: "demo-user",
        email: "demo@jupicks.local",
        name: "Demo Player",
      });
    }
  }, [supabaseOn]);

  // ─── Entry builder ──────────────────────────────────────
  const addBuilderPick = useCallback((pick: BuilderPick) => {
    setBuilderPicks((prev) => {
      if (prev.some((p) => p.projectionId === pick.projectionId)) return prev;
      return [...prev, pick];
    });
  }, []);

  const removeBuilderPick = useCallback((projectionId: string) => {
    setBuilderPicks((prev) => prev.filter((p) => p.projectionId !== projectionId));
  }, []);

  const clearBuilder = useCallback(() => {
    setBuilderPicks([]);
    setBuilderAmount(0);
  }, []);

  // ─── Submit entry ───────────────────────────────────────
  const submitEntry = useCallback(async (contestTypeId: string): Promise<{ success: boolean; error?: string; entryId?: string }> => {
    if (builderPicks.length < 1) return { success: false, error: "Add at least one pick" };
    if (builderAmount < 1) return { success: false, error: "Set an entry amount" };
    const amountCents = builderAmount * 100;

    if (supabaseOn) {
      try {
        const { jpPlaceEntry } = await import("../db/jp-rpc");
        const result = await jpPlaceEntry({
          contestTypeId,
          entryAmountCredits: amountCents,
          picks: builderPicks.map((p) => ({
            projectionId: p.projectionId,
            direction: p.direction,
          })),
          powerMode: builderMode === "POWER",
          idempotencyKey: "entry-" + uid().slice(0, 16),
        });
        clearBuilder();
        await refreshWallet();
        await refreshEntries();
        return { success: true, entryId: result.entry_id };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Submission failed" };
      }
    }

    // Demo mode: simulate the entry placement
    const wallet = loadDemoWallet();
    if (wallet.balanceCents < amountCents) {
      return { success: false, error: "INSUFFICIENT_CREDITS — not enough virtual credits" };
    }

    const newBalance = wallet.balanceCents - amountCents;
    const entryId = uid();
    const now = new Date().toISOString();

    const newEntry: AppEntry = {
      entryId,
      status: "open",
      mode: builderMode,
      entryAmountCents: amountCents,
      powerMode: builderMode === "POWER",
      createdAt: now,
      picks: builderPicks.map((p) => ({
        projectionId: p.projectionId,
        direction: p.direction,
        playerName: p.playerName,
        statType: p.statType,
        line: p.line,
        lockedLine: p.line,
        outcome: null,
        actualValue: null,
      })),
      outcome: null,
      rewardCreditsCents: null,
      settlementVersion: 0,
    };

    // Update wallet
    saveDemoWallet({ balanceCents: newBalance, startingCreditGranted: true });

    // Add ledger entry
    const stakeLedger: LedgerEntry = {
      id: uid(),
      type: "ENTRY_STAKE",
      amountCents: -amountCents,
      balanceAfterCents: newBalance,
      entryId,
      reason: "Entry stake (" + builderPicks.length + " picks)",
      idempotencyKey: "entry-" + entryId.slice(0, 16),
      createdAt: now,
    };
    const currentLedger = loadDemoLedger();
    saveDemoLedger([stakeLedger, ...currentLedger]);

    // Save entry
    const currentEntries = loadDemoEntries();
    saveDemoEntries([newEntry, ...currentEntries]);

    clearBuilder();
    refreshDemoState();
    return { success: true, entryId };
  }, [builderPicks, builderAmount, builderMode, supabaseOn, clearBuilder, refreshWallet, refreshEntries]);

  // ─── Demo settlement ─────────────────────────────────────
  const settleDemoEntry = useCallback((entryId: string, outcomes: Array<{ projectionId: string; actualValue: number; isFinal: boolean; isVoid: boolean }>) => {
    if (supabaseOn) return; // Server-side only in connected mode

    const currentEntries = loadDemoEntries();
    const entry = currentEntries.find((e) => e.entryId === entryId);
    if (!entry || entry.status === "settled") return;

    // Resolve each pick
    const updatedPicks = entry.picks.map((p) => {
      const outcome = outcomes.find((o) => o.projectionId === p.projectionId);
      if (!outcome) return p;
      const pickOutcome: PickOutcome = settlePick({
        direction: p.direction,
        line: p.lockedLine ?? p.line ?? 0,
        actualValue: outcome.actualValue,
        isFinal: outcome.isFinal,
        isVoid: outcome.isVoid,
      });
      return { ...p, outcome: pickOutcome, actualValue: outcome.actualValue };
    });

    const summary = summarizePickOutcomes(updatedPicks.map((p) => p.outcome as PickOutcome));
    const entryOutcome: string = entry.powerMode
      ? determinePowerOutcome(summary)
      : (determineFlexOutcome(summary) === "REQUIRES_CONFIG" ? "LOSS" : determineFlexOutcome(summary));

    let creditAmount = 0;
    let ledgerType = "";
    if (entryOutcome === "WIN") {
      const multiplier = entry.powerMode ? 3 : 2;
      creditAmount = entry.entryAmountCents * multiplier;
      ledgerType = "ENTRY_WIN";
    } else if (entryOutcome === "PUSH" || entryOutcome === "VOID") {
      creditAmount = entry.entryAmountCents;
      ledgerType = "ENTRY_REFUND";
    }

    const updatedEntry: AppEntry = {
      ...entry,
      picks: updatedPicks,
      status: "settled",
      outcome: entryOutcome,
      rewardCreditsCents: creditAmount > 0 ? creditAmount : null,
      settlementVersion: 1,
    };

    // Update entries
    const newEntries = currentEntries.map((e) => e.entryId === entryId ? updatedEntry : e);
    saveDemoEntries(newEntries);

    // Credit wallet if needed
    if (creditAmount > 0) {
      const wallet = loadDemoWallet();
      const newBalance = wallet.balanceCents + creditAmount;
      saveDemoWallet({ balanceCents: newBalance, startingCreditGranted: true });
      const currentLedger = loadDemoLedger();
      const settleLedger: LedgerEntry = {
        id: uid(),
        type: ledgerType,
        amountCents: creditAmount,
        balanceAfterCents: newBalance,
        entryId,
        reason: "Settlement: " + entryOutcome,
        idempotencyKey: "settle-" + entryId.slice(0, 16),
        createdAt: new Date().toISOString(),
      };
      saveDemoLedger([settleLedger, ...currentLedger]);
    }

    refreshDemoState();
  }, [supabaseOn]);

  const value: AppContextValue = {
    user,
    isLoading,
    isDemoMode,
    isDbConnected,
    signUp,
    signIn,
    signOut,
    balanceCredits,
    ledger,
    refreshWallet,
    entries,
    refreshEntries,
    builderPicks,
    builderMode,
    builderAmount,
    addBuilderPick,
    removeBuilderPick,
    setBuilderMode,
    setBuilderAmount,
    clearBuilder,
    submitEntry,
    settleDemoEntry,
    flags,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}