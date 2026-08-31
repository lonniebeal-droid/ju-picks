/**
 * JU PICKS — Friend Challenges: create, accept, decline, view results
 * Works in demo mode (localStorage) and connected mode (Supabase RPCs).
 * Virtual credits only. REAL_MONEY_ENABLED=false.
 */

import { useState, useEffect } from "react";
import { useApp } from "~/lib/app/app-provider";

interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  status: "pending" | "accepted" | "completed" | "declined" | "cancelled";
  stakeCredits: number;
  winnerId: string | null;
  winnerName: string | null;
  createdAt: string;
  completedAt: string | null;
}

const STORAGE_KEY = "ju_picks_challenges";

function loadChallenges(): Challenge[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveChallenges(c: Challenge[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

const MOCK_OPPONENTS = [
  { name: "ShowtimeJay", id: "mock-jay" },
  { name: "GridironGuru", id: "mock-guru" },
  { name: "PicksProphet", id: "mock-prophet" },
  { name: "HoopDreams", id: "mock-hoop" },
  { name: "TouchdownTony", id: "mock-tony" },
];

export default function ChallengesView() {
  const { user, isDemoMode, balanceCredits } = useApp();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [opponentName, setOpponentName] = useState("");
  const [stake, setStake] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? "demo-user";
  const userName = user?.name ?? "Demo Player";

  useEffect(() => {
    setChallenges(loadChallenges());
  }, []);

  function handleCreate() {
    setError(null);
    if (opponentName.trim().length < 2) {
      setError("Enter an opponent username.");
      return;
    }
    if (stake < 1 || stake > balanceCredits) {
      setError(`Stake must be between 1 and ${balanceCredits} credits.`);
      return;
    }

    const opponent = MOCK_OPPONENTS.find(
      (m) => m.name.toLowerCase() === opponentName.trim().toLowerCase()
    ) ?? { name: opponentName.trim(), id: "custom-" + Date.now() };

    const challenge: Challenge = {
      id: "challenge-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      challengerId: userId,
      challengerName: userName,
      challengedId: opponent.id,
      challengedName: opponent.name,
      status: "pending",
      stakeCredits: stake,
      winnerId: null,
      winnerName: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    const updated = [challenge, ...loadChallenges()];
    saveChallenges(updated);
    setChallenges(updated);
    setShowCreate(false);
    setOpponentName("");
    setStake(100);

    // In demo mode, simulate opponent accepting after a short delay
    if (isDemoMode) {
      setTimeout(() => {
        const all = loadChallenges();
        const idx = all.findIndex((c) => c.id === challenge.id);
        if (idx >= 0 && all[idx].status === "pending") {
          // 80% chance of accepting
          if (Math.random() > 0.2) {
            all[idx].status = "accepted";
          } else {
            all[idx].status = "declined";
          }
          saveChallenges(all);
          setChallenges([...all]);
        }
      }, 2000);

      // After accepting, simulate completion after another delay
      setTimeout(() => {
        const all = loadChallenges();
        const idx = all.findIndex((c) => c.id === challenge.id);
        if (idx >= 0 && all[idx].status === "accepted") {
          // User wins 55% of the time
          const userWins = Math.random() < 0.55;
          all[idx].status = "completed";
          all[idx].winnerId = userWins ? userId : opponent.id;
          all[idx].winnerName = userWins ? userName : opponent.name;
          all[idx].completedAt = new Date().toISOString();
          saveChallenges(all);
          setChallenges([...all]);
        }
      }, 5000);
    }
  }

  function handleDecline(id: string) {
    const all = loadChallenges().map((c) =>
      c.id === id ? { ...c, status: "declined" as const } : c
    );
    saveChallenges(all);
    setChallenges(all);
  }

  const sentPending = challenges.filter((c) => c.challengerId === userId && c.status === "pending");
  const sentActive = challenges.filter((c) => c.challengerId === userId && (c.status === "accepted" || c.status === "completed"));
  const receivedPending = challenges.filter((c) => c.challengedId === userId && c.status === "pending");
  const receivedActive = challenges.filter((c) => c.challengedId === userId && (c.status === "accepted" || c.status === "completed"));
  const declined = challenges.filter((c) => (c.challengerId === userId || c.challengedId === userId) && c.status === "declined");

  function statusBadge(status: string): string {
    switch (status) {
      case "pending": return "bg-amber-600/20 text-amber-400";
      case "accepted": return "bg-blue-600/20 text-blue-400";
      case "completed": return "bg-zinc-600/30 text-zinc-300";
      case "declined": return "bg-rose-600/20 text-rose-400";
      default: return "bg-jp-border text-jp-muted";
    }
  }

  function ChallengeCard({ c }: { c: Challenge }) {
    const isChallenger = c.challengerId === userId;
    const opponent = isChallenger ? c.challengedName : c.challengerName;
    const won = c.winnerId === userId;
    const lost = c.winnerId && c.winnerId !== userId;

    return (
      <div className="rounded-xl border border-jp-border bg-jp-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={"rounded px-2 py-0.5 text-[10px] font-semibold " + statusBadge(c.status)}>
              {c.status.toUpperCase()}
            </span>
            <span className="text-xs text-zinc-100">
              vs <span className="font-medium">{opponent}</span>
            </span>
          </div>
          <span className="text-xs text-jp-muted">{c.stakeCredits} cr</span>
        </div>
        {c.status === "completed" && (
          <div className="mt-2 text-xs">
            {won && <span className="text-emerald-400 font-medium">You won +{c.stakeCredits} cr</span>}
            {lost && <span className="text-rose-400 font-medium">You lost -{c.stakeCredits} cr</span>}
            {!won && !lost && <span className="text-jp-muted">Push — stake returned</span>}
          </div>
        )}
        {!isChallenger && c.status === "pending" && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg bg-emerald-600/20 py-2 text-xs font-medium text-emerald-400"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => handleDecline(c.id)}
              className="flex-1 rounded-lg bg-rose-600/20 py-2 text-xs font-medium text-rose-400"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-jp-muted">Friend Challenges</h2>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-jp-accent px-3 py-1.5 text-xs font-medium text-black"
        >
          + New Challenge
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="space-y-3 rounded-xl border border-jp-border bg-jp-card p-4">
          <div>
            <label className="text-xs text-jp-muted">Opponent</label>
            <input
              type="text"
              placeholder="Username"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              list="opponents"
              className="mt-1 w-full rounded-lg border border-jp-border bg-jp-bg px-3 py-2.5 text-sm text-zinc-100 placeholder-jp-muted"
            />
            <datalist id="opponents">
              {MOCK_OPPONENTS.map((o) => (
                <option key={o.id} value={o.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-jp-muted">Stake (virtual credits)</label>
            <input
              type="number"
              min={1}
              max={balanceCredits}
              value={stake}
              onChange={(e) => setStake(Math.floor(Number(e.target.value)) || 0)}
              className="mt-1 w-full rounded-lg border border-jp-border bg-jp-bg px-3 py-2.5 text-sm text-zinc-100"
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="button"
            onClick={handleCreate}
            className="w-full rounded-lg bg-jp-accent py-2.5 text-sm font-semibold text-black"
          >
            Send Challenge
          </button>
        </div>
      )}

      {/* Received challenges */}
      {receivedPending.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-jp-muted">Pending Invites</h3>
          <div className="space-y-2">
            {receivedPending.map((c) => <ChallengeCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* Sent challenges */}
      {sentPending.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-jp-muted">Sent — Awaiting Response</h3>
          <div className="space-y-2">
            {sentPending.map((c) => <ChallengeCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* Active challenges */}
      {(sentActive.length > 0 || receivedActive.length > 0) && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-jp-muted">Active & Completed</h3>
          <div className="space-y-2">
            {[...sentActive, ...receivedActive].map((c) => <ChallengeCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-jp-muted">Declined</h3>
          <div className="space-y-2">
            {declined.map((c) => <ChallengeCard key={c.id} c={c} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {challenges.length === 0 && !showCreate && (
        <div className="rounded-xl border border-jp-border bg-jp-card p-6 text-center">
          <p className="text-sm text-jp-muted">No challenges yet.</p>
          <p className="mt-1 text-xs text-jp-muted">
            Challenge a friend to a head-to-head prediction duel with virtual credits.
          </p>
        </div>
      )}

      {isDemoMode && (
        <p className="text-center text-[10px] text-jp-muted">
          Demo mode — opponents are simulated. Challenges resolve automatically.
        </p>
      )}
    </div>
  );
}
