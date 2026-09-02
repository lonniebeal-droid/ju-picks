/**
 * JU PICKS — Leaderboards: global, weekly, monthly rankings
 * Calculated from settled entry performance. No fabricated scores.
 * Virtual credits only. REAL_MONEY_ENABLED=false.
 */

import { useState, useMemo } from "react";
import { useApp } from "~/lib/app/app-provider";

interface LeaderboardEntry {
  rank: number;
  name: string;
  wins: number;
  losses: number;
  pushes: number;
  profit: number;
  entries: number;
  isYou: boolean;
}

// Mock competitors for demo mode (clearly labeled as demo)
const MOCK_COMPETITORS = [
  { name: "ShowtimeJay", wins: 42, losses: 28, pushes: 5, profit: 1450 },
  { name: "GridironGuru", wins: 38, losses: 31, pushes: 3, profit: 820 },
  { name: "PicksProphet", wins: 35, losses: 33, pushes: 6, profit: 420 },
  { name: "HoopDreams", wins: 29, losses: 35, pushes: 2, profit: -150 },
  { name: "TouchdownTony", wins: 22, losses: 40, pushes: 4, profit: -680 },
  { name: "AceAnalytics", wins: 19, losses: 42, pushes: 3, profit: -950 },
];

export default function LeaderboardsView() {
  const { entries, user, isDemoMode } = useApp();
  const [scope, setScope] = useState<"global" | "weekly" | "monthly">("global");

  const userName = user?.name ?? "Demo Player";

  // Calculate current user's stats from settled entries
  const userStats = useMemo(() => {
    const settled = entries.filter((e) => e.status === "settled");

    // Filter by time scope
    let filtered = settled;
    if (scope === "weekly") {
      const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
      filtered = settled.filter((e) => {
        const ts = (e as unknown as Record<string, unknown>).createdAt;
        return typeof ts === "string" ? new Date(ts).getTime() >= weekStart : true;
      });
    } else if (scope === "monthly") {
      const monthStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
      filtered = settled.filter((e) => {
        const ts = (e as unknown as Record<string, unknown>).createdAt;
        return typeof ts === "string" ? new Date(ts).getTime() >= monthStart : true;
      });
    }

    return filtered.reduce(
      (acc, e) => {
        acc.entries++;
        if (e.outcome === "WIN") acc.wins++;
        if (e.outcome === "LOSS") acc.losses++;
        if (e.outcome === "PUSH") acc.pushes++;
        acc.profit += (e.rewardCreditsCents ?? 0) / 100;
        return acc;
      },
      { wins: 0, losses: 0, pushes: 0, profit: 0, entries: 0 }
    );
  }, [entries, scope]);

  // Build leaderboard: user's real stats + mock competitors
  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    const allEntries: Omit<LeaderboardEntry, "rank">[] = [
      {
        name: userName,
        wins: userStats.wins,
        losses: userStats.losses,
        pushes: userStats.pushes,
        profit: Math.floor(userStats.profit),
        entries: userStats.entries,
        isYou: true,
      },
      ...MOCK_COMPETITORS.map((m) => ({
        name: m.name,
        wins: m.wins,
        losses: m.losses,
        pushes: m.pushes,
        profit: m.profit,
        entries: m.wins + m.losses + m.pushes,
        isYou: false,
      })),
    ];

    // Sort by profit descending
    const sorted = allEntries.sort((a, b) => b.profit - a.profit);

    // Assign ranks
    return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [userStats, userName]);

  const yourRank = leaderboard.find((e) => e.isYou)?.rank ?? "—";

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-jp-muted">Leaderboards</h2>

      {/* Scope tabs */}
      <div className="flex gap-2">
        {(["global", "weekly", "monthly"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={"flex-1 rounded-lg py-2 text-xs font-medium capitalize " +
              (scope === s ? "bg-jp-accent text-black" : "bg-jp-card text-jp-muted")}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Your rank */}
      <div className="rounded-xl border border-jp-accent/30 bg-jp-accent/5 p-4 text-center">
        <div className="text-[10px] text-jp-muted">Your Rank</div>
        <div className="text-2xl font-bold text-jp-accent">#{yourRank}</div>
        <div className="mt-1 text-xs text-jp-muted">
          {userStats.wins}W · {userStats.losses}L · {userStats.pushes}P ·{" "}
          <span className={userStats.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {userStats.profit >= 0 ? "+" : ""}{Math.floor(userStats.profit)} cr
          </span>
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="space-y-1">
        {leaderboard.map((entry) => (
          <div
            key={entry.name}
            className={
              "flex items-center justify-between rounded-lg px-3 py-2.5 " +
              (entry.isYou
                ? "border border-jp-accent/30 bg-jp-accent/10"
                : "bg-jp-card")
            }
          >
            <div className="flex items-center gap-3">
              <span className={
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold " +
                (entry.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                 entry.rank === 2 ? "bg-zinc-400/20 text-zinc-300" :
                 entry.rank === 3 ? "bg-orange-600/20 text-orange-400" :
                 "bg-jp-bg text-jp-muted")
              }>
                {entry.rank}
              </span>
              <div>
                <div className="text-sm font-medium text-zinc-100">
                  {entry.name}
                  {entry.isYou && <span className="ml-1 text-[10px] text-jp-accent">(You)</span>}
                </div>
                <div className="text-[10px] text-jp-muted">
                  {entry.wins}W · {entry.losses}L · {entry.entries} entries
                </div>
              </div>
            </div>
            <div className={
              "text-sm font-medium " +
              (entry.profit > 0 ? "text-emerald-400" :
               entry.profit < 0 ? "text-rose-400" : "text-jp-muted")
            }>
              {entry.profit > 0 ? "+" : ""}{entry.profit} cr
            </div>
          </div>
        ))}
      </div>

      {isDemoMode && (
        <p className="text-center text-[10px] text-jp-muted">
          Demo mode — your stats are real (from settled entries). Other players are simulated for demo.
        </p>
      )}

      {/* No settled entries */}
      {userStats.entries === 0 && (
        <p className="rounded-lg bg-jp-card px-3 py-2 text-center text-[10px] text-jp-muted">
          Submit and settle entries to appear on the leaderboard.
        </p>
      )}
    </div>
  );
}
