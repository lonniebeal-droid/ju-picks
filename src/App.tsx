/**
 * JU PICKS — Mobile-first app shell
 * Virtual credits only. No cash value. No withdrawals.
 * REAL_MONEY_ENABLED=false.
 */

import { useState, lazy, Suspense } from "react";
import { AppProvider, useApp } from "~/lib/app/app-provider";

const BoardView = lazy(() => import("~/views/BoardView"));
const SlipView = lazy(() => import("~/views/SlipView"));
const WalletView = lazy(() => import("~/views/WalletView"));
const ProfileView = lazy(() => import("~/views/ProfileView"));

type Tab = "board" | "slip" | "play" | "wallet" | "profile";

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { user, isLoading, isDemoMode } = useApp();
  const [tab, setTab] = useState<Tab>("board");

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-jp-bg text-jp-muted">
        <div className="text-center">
          <div className="text-2xl font-bold text-jp-accent">JU PICKS</div>
          <div className="mt-2 text-sm">Loading…</div>
        </div>
      </div>
    );
  }

  // In connected mode, require auth
  if (!user && !isDemoMode) {
    return <AuthRequired />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-jp-bg text-zinc-100">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-20">
        <Suspense fallback={<div className="text-sm text-jp-muted">Loading…</div>}>
          {tab === "board" && <BoardView />}
          {tab === "slip" && <SlipView />}
          {tab === "play" && <PlayView />}
          {tab === "wallet" && <WalletView />}
          {tab === "profile" && <ProfileView />}
        </Suspense>
      </main>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

function Header() {
  const { balanceCredits, isDemoMode } = useApp();
  return (
    <header className="sticky top-0 z-10 border-b border-jp-border bg-jp-bg/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">
          JU PICKS
          {isDemoMode && (
            <span className="ml-2 rounded bg-jp-card px-1.5 py-0.5 text-[10px] font-normal text-jp-muted">
              DEMO
            </span>
          )}
        </h1>
        <div className="rounded-full bg-jp-card px-3 py-1 text-sm font-medium text-jp-accent">
          {balanceCredits.toLocaleString()} <span className="text-xs text-jp-muted">credits</span>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-jp-muted">
        Virtual credits only · No cash value · No deposits or withdrawals
      </p>
    </header>
  );
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { builderPicks } = useApp();
  const tabs: Array<[Tab, string]> = [
    ["board", "Board"],
    ["slip", "Slip"],
    ["play", "Play"],
    ["wallet", "Wallet"],
    ["profile", "Profile"],
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-jp-border bg-jp-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={"relative flex-1 py-3 text-center text-xs font-medium transition-colors " +
              (tab === id ? "text-jp-accent" : "text-jp-muted hover:text-zinc-200")}
          >
            {label}
            {id === "slip" && builderPicks.length > 0 && (
              <span className="absolute top-1.5 right-[25%] flex h-4 min-w-4 items-center justify-center rounded-full bg-jp-accent px-1 text-[10px] font-bold text-black">
                {builderPicks.length}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

function AuthRequired() {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-jp-bg px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-jp-accent">JU PICKS</h1>
          <p className="mt-1 text-sm text-jp-muted">
            Free-to-play sports predictions with virtual credits
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={"flex-1 rounded-lg py-2 text-sm font-medium " +
                (mode === "signin" ? "bg-jp-accent text-black" : "bg-jp-card text-jp-muted")}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={"flex-1 rounded-lg py-2 text-sm font-medium " +
                (mode === "signup" ? "bg-jp-accent text-black" : "bg-jp-card text-jp-muted")}
            >
              Sign Up
            </button>
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-jp-border bg-jp-card px-3 py-2.5 text-sm text-zinc-100 placeholder-jp-muted"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-jp-border bg-jp-card px-3 py-2.5 text-sm text-zinc-100 placeholder-jp-muted"
          />
          {error && (
            <p className="rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-jp-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <p className="text-center text-xs text-jp-muted">
          Virtual credits only. No cash. No deposits. No withdrawals.
        </p>
      </div>
    </div>
  );
}

function PlayView() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-jp-muted">Play & Compete</h2>
      <div className="space-y-3">
        <div className="rounded-xl border border-jp-border bg-jp-card p-4">
          <h3 className="font-medium text-zinc-100">JU Rooms</h3>
          <p className="mt-1 text-xs text-jp-muted">
            Create private rooms, invite friends, and compete on room leaderboards.
          </p>
          <div className="mt-3 rounded-lg bg-jp-bg px-3 py-2 text-xs text-jp-muted">
            Coming soon — rooms require database configuration.
          </div>
        </div>
        <div className="rounded-xl border border-jp-border bg-jp-card p-4">
          <h3 className="font-medium text-zinc-100">Friend Challenges</h3>
          <p className="mt-1 text-xs text-jp-muted">
            Challenge a friend head-to-head with virtual credits.
          </p>
          <div className="mt-3 rounded-lg bg-jp-bg px-3 py-2 text-xs text-jp-muted">
            Coming soon — challenges require database configuration.
          </div>
        </div>
        <div className="rounded-xl border border-jp-border bg-jp-card p-4">
          <h3 className="font-medium text-zinc-100">Leaderboards</h3>
          <p className="mt-1 text-xs text-jp-muted">
            Compete globally and weekly with other players.
          </p>
          <div className="mt-3 rounded-lg bg-jp-bg px-3 py-2 text-xs text-jp-muted">
            Coming soon — leaderboards require settled entry data.
          </div>
        </div>
      </div>
    </div>
  );
}
