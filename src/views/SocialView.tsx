/**
 * JU PICKS — Social layer: profiles, follows, activity feed
 * Works in demo mode (localStorage) with mock users.
 * Virtual credits only. REAL_MONEY_ENABLED=false.
 */

import { useState, useEffect, useMemo } from "react";
import { useApp } from "~/lib/app/app-provider";

interface SocialUser {
  id: string;
  name: string;
  bio: string;
  isFollowing: boolean;
  wins: number;
  losses: number;
}

const MOCK_USERS: Omit<SocialUser, "isFollowing">[] = [
  { id: "mock-jay", name: "ShowtimeJay", bio: "NFL picks specialist. Higher is always better.", wins: 42, losses: 28 },
  { id: "mock-guru", name: "GridironGuru", bio: "Underdog player props only. Analytics over gut.", wins: 38, losses: 31 },
  { id: "mock-prophet", name: "PicksProphet", bio: "NBA player props are my domain.", wins: 35, losses: 33 },
  { id: "mock-hoop", name: "HoopDreams", bio: "Points, rebounds, assists — I live for the box score.", wins: 29, losses: 35 },
  { id: "mock-tony", name: "TouchdownTony", bio: "TD scorers and passing yards. Every Sunday.", wins: 22, losses: 40 },
  { id: "mock-ace", name: "AceAnalytics", bio: "Data-driven picks. No emotions, just numbers.", wins: 19, losses: 42 },
];

const FOLLOWING_KEY = "ju_picks_following";

function loadFollowing(): string[] {
  try { return JSON.parse(localStorage.getItem(FOLLOWING_KEY) || "[]"); } catch { return []; }
}
function saveFollowing(ids: string[]) {
  localStorage.setItem(FOLLOWING_KEY, JSON.stringify(ids));
}

export default function SocialView() {
  const { entries, isDemoMode } = useApp();
  const [search, setSearch] = useState("");
  const [following, setFollowing] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<SocialUser | null>(null);

  useEffect(() => {
    setFollowing(loadFollowing());
  }, []);

  const allUsers: SocialUser[] = useMemo(() => {
    return MOCK_USERS.map((u) => ({
      ...u,
      isFollowing: following.includes(u.id),
    }));
  }, [following]);

  const filteredUsers = allUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const followingUsers = allUsers.filter((u) => u.isFollowing);

  function toggleFollow(id: string) {
    const updated = following.includes(id)
      ? following.filter((f) => f !== id)
      : [...following, id];
    setFollowing(updated);
    saveFollowing(updated);
    if (selectedUser?.id === id) {
      setSelectedUser({ ...selectedUser, isFollowing: !selectedUser.isFollowing });
    }
  }

  // Activity feed from user's entries
  const activity = entries.slice(0, 10).map((e) => ({
    type: e.status === "settled" ? (e.outcome === "WIN" ? "win" : e.outcome === "LOSS" ? "loss" : "push") : "entry",
    text: e.status === "settled"
      ? `${e.outcome === "WIN" ? "Won" : e.outcome === "LOSS" ? "Lost" : "Pushed"} entry with ${e.picks.length} pick${e.picks.length > 1 ? "s" : ""}`
      : `Submitted ${e.picks.length}-pick ${e.mode} entry for ${Math.floor(e.entryAmountCents / 100)} cr`,
    timestamp: (e as Record<string, unknown>).createdAt as string | undefined,
  }));

  function activityIcon(type: string): string {
    switch (type) {
      case "win": return "🏆";
      case "loss": return "❌";
      case "push": return "🤝";
      case "entry": return "📝";
      default: return "•";
    }
  }

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedUser(null)}
          className="rounded-lg bg-jp-card px-3 py-1.5 text-xs text-jp-muted"
        >
          ← Back
        </button>

        {/* Profile card */}
        <div className="rounded-xl border border-jp-border bg-jp-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-zinc-100">{selectedUser.name}</div>
              <div className="text-xs text-jp-muted">{selectedUser.bio}</div>
            </div>
            <button
              type="button"
              onClick={() => toggleFollow(selectedUser.id)}
              className={
                "rounded-lg px-4 py-2 text-xs font-medium " +
                (selectedUser.isFollowing
                  ? "bg-jp-card text-jp-muted border border-jp-border"
                  : "bg-jp-accent text-black")
              }
            >
              {selectedUser.isFollowing ? "Following" : "+ Follow"}
            </button>
          </div>
          <div className="mt-3 flex gap-4 text-xs">
            <div className="text-center">
              <div className="font-bold text-emerald-400">{selectedUser.wins}</div>
              <div className="text-jp-muted">Wins</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-rose-400">{selectedUser.losses}</div>
              <div className="text-jp-muted">Losses</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-zinc-100">
                {((selectedUser.wins / (selectedUser.wins + selectedUser.losses)) * 100).toFixed(0)}%
              </div>
              <div className="text-jp-muted">Win Rate</div>
            </div>
          </div>
        </div>

        {/* Mock activity */}
        <div>
          <h3 className="mb-2 text-xs font-medium text-jp-muted">Recent Activity</h3>
          <div className="space-y-1">
            <div className="rounded-lg bg-jp-card px-3 py-2 text-xs">
              <span className="mr-2">🏆</span>
              <span className="text-zinc-100">Won 3-pick POWER entry</span>
              <span className="float-right text-jp-muted">2d ago</span>
            </div>
            <div className="rounded-lg bg-jp-card px-3 py-2 text-xs">
              <span className="mr-2">📝</span>
              <span className="text-zinc-100">Submitted 2-pick FLEX entry</span>
              <span className="float-right text-jp-muted">3d ago</span>
            </div>
            <div className="rounded-lg bg-jp-card px-3 py-2 text-xs">
              <span className="mr-2">❌</span>
              <span className="text-zinc-100">Lost 1-pick entry</span>
              <span className="float-right text-jp-muted">5d ago</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-jp-muted">Social</h2>

      {/* Your activity */}
      <div>
        <h3 className="mb-2 text-xs font-medium text-jp-muted">Your Recent Activity</h3>
        {activity.length === 0 ? (
          <p className="rounded-lg bg-jp-card px-3 py-3 text-center text-xs text-jp-muted">
            No activity yet. Submit picks to build your activity feed.
          </p>
        ) : (
          <div className="space-y-1">
            {activity.map((a, i) => (
              <div key={i} className="rounded-lg bg-jp-card px-3 py-2 text-xs">
                <span className="mr-2">{activityIcon(a.type)}</span>
                <span className="text-zinc-100">{a.text}</span>
                {a.timestamp && (
                  <span className="float-right text-jp-muted">
                    {new Date(a.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Following count */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-jp-muted">Following: {followingUsers.length}</span>
      </div>

      {/* User search */}
      <div>
        <h3 className="mb-2 text-xs font-medium text-jp-muted">Discover Players</h3>
        <input
          type="text"
          placeholder="Search by username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-lg border border-jp-border bg-jp-card px-3 py-2 text-sm text-zinc-100 placeholder-jp-muted"
        />
        <div className="space-y-2">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-xl border border-jp-border bg-jp-card p-3"
            >
              <button
                type="button"
                onClick={() => setSelectedUser(u)}
                className="flex-1 text-left"
              >
                <div className="text-sm font-medium text-zinc-100">{u.name}</div>
                <div className="text-[10px] text-jp-muted">
                  {u.wins}W · {u.losses}L · {((u.wins / (u.wins + u.losses)) * 100).toFixed(0)}% win rate
                </div>
              </button>
              <button
                type="button"
                onClick={() => toggleFollow(u.id)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-medium " +
                  (u.isFollowing
                    ? "bg-jp-card text-jp-muted border border-jp-border"
                    : "bg-jp-accent text-black")
                }
              >
                {u.isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {isDemoMode && (
        <p className="text-center text-[10px] text-jp-muted">
          Demo mode — player profiles are simulated for demo purposes.
        </p>
      )}
    </div>
  );
}
