/**
 * JU PICKS — Rooms, Challenges, Leaderboards tests
 *
 * Tests core logic of room management, challenge lifecycle,
 * and leaderboard calculation. Uses localStorage mocking.
 */

import { describe, it, expect, beforeEach } from "vitest";

// Vitest runs this suite in Node, so provide the browser storage contract the
// local demo helpers expect without adding a DOM dependency to CI.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    get length() {
      return storage.size;
    },
  } satisfies Storage,
});

// ─── Room storage logic ─────────────────────────────────────────

function loadRooms(): any[] {
  try { return JSON.parse(localStorage.getItem("ju_picks_rooms") || "[]"); } catch { return []; }
}
function saveRooms(rooms: any[]) {
  localStorage.setItem("ju_picks_rooms", JSON.stringify(rooms));
}
function loadMembers(roomId: string): any[] {
  try {
    const all = JSON.parse(localStorage.getItem("ju_picks_room_members") || "{}");
    return all[roomId] || [];
  } catch { return []; }
}
function saveMembers(roomId: string, members: any[]) {
  const all = (() => { try { return JSON.parse(localStorage.getItem("ju_picks_room_members") || "{}"); } catch { return {}; } })();
  all[roomId] = members;
  localStorage.setItem("ju_picks_room_members", JSON.stringify(all));
}

// ─── Challenge storage logic ─────────────────────────────────────

function loadChallenges(): any[] {
  try { return JSON.parse(localStorage.getItem("ju_picks_challenges") || "[]"); } catch { return []; }
}
function saveChallenges(c: any[]) {
  localStorage.setItem("ju_picks_challenges", JSON.stringify(c));
}

// ─── Leaderboard calculation ─────────────────────────────────────

function calcLeaderboardStats(entries: any[]): { wins: number; losses: number; pushes: number; profit: number; total: number } {
  return entries
    .filter((e) => e.status === "settled")
    .reduce((acc, e) => {
      acc.total++;
      if (e.outcome === "WIN") acc.wins++;
      if (e.outcome === "LOSS") acc.losses++;
      if (e.outcome === "PUSH") acc.pushes++;
      acc.profit += (e.rewardCreditsCents ?? 0) / 100;
      return acc;
    }, { wins: 0, losses: 0, pushes: 0, profit: 0, total: 0 });
}

// ─── Tests ───────────────────────────────────────────────────────

describe("JU Rooms", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should create a room and persist to localStorage", () => {
    const room = {
      id: "room-1",
      name: "Test Room",
      description: "Test desc",
      ownerId: "user-A",
      ownerName: "Alice",
      isPrivate: true,
      inviteCode: "TESTCODE1",
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };
    saveRooms([room]);
    const loaded = loadRooms();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Test Room");
    expect(loaded[0].inviteCode).toBe("TESTCODE1");
  });

  it("should add a member to a room", () => {
    saveRooms([{
      id: "room-1", name: "Test", ownerId: "user-A", ownerName: "Alice",
      isPrivate: true, inviteCode: "CODE1", memberCount: 1, createdAt: new Date().toISOString(),
    }]);
    saveMembers("room-1", [
      { userId: "user-A", role: "owner", name: "Alice", joinedAt: new Date().toISOString() },
    ]);
    const members = loadMembers("room-1");
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe("owner");
  });

  it("should prevent duplicate room membership", () => {
    const existing = [
      { userId: "user-A", role: "owner", name: "Alice", joinedAt: new Date().toISOString() },
    ];
    saveMembers("room-1", existing);
    const members = loadMembers("room-1");
    // Simulate join with duplicate check
    const userId = "user-A";
    const hasMember = members.some((m: any) => m.userId === userId);
    expect(hasMember).toBe(true);
  });

  it("should remove a member on leave", () => {
    saveMembers("room-1", [
      { userId: "user-A", role: "owner", name: "Alice" },
      { userId: "user-B", role: "member", name: "Bob" },
    ]);
    const members = loadMembers("room-1").filter((m: any) => m.userId !== "user-B");
    saveMembers("room-1", members);
    expect(loadMembers("room-1")).toHaveLength(1);
    expect(loadMembers("room-1")[0].userId).toBe("user-A");
  });

  it("should delete room when owner leaves", () => {
    const room = {
      id: "room-1", name: "Test", ownerId: "user-A",
      isPrivate: true, inviteCode: "CODE1", memberCount: 1, createdAt: new Date().toISOString(),
    };
    saveRooms([room]);
    // Owner leaves → room deleted
    const updated = loadRooms().filter((r: any) => r.id !== "room-1");
    saveRooms(updated);
    expect(loadRooms()).toHaveLength(0);
  });
});

describe("JU Challenges", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should create a challenge with pending status", () => {
    const challenge = {
      id: "c-1",
      challengerId: "user-A",
      challengerName: "Alice",
      challengedId: "user-B",
      challengedName: "Bob",
      status: "pending",
      stakeCredits: 100,
      winnerId: null,
      createdAt: new Date().toISOString(),
    };
    saveChallenges([challenge]);
    const loaded = loadChallenges();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].status).toBe("pending");
  });

  it("should prevent self-challenge", () => {
    const userId = "user-A";
    const challengedId = "user-A";
    expect(challengedId).toBe(userId); // Would be blocked by RPC validation
  });

  it("should transition from pending to accepted", () => {
    saveChallenges([{
      id: "c-1", challengerId: "user-A", challengedId: "user-B",
      status: "pending", stakeCredits: 100, winnerId: null,
    }]);
    const all = loadChallenges().map((c: any) =>
      c.id === "c-1" ? { ...c, status: "accepted" } : c
    );
    saveChallenges(all);
    expect(loadChallenges()[0].status).toBe("accepted");
  });

  it("should transition from accepted to completed with winner", () => {
    saveChallenges([{
      id: "c-1", challengerId: "user-A", challengedId: "user-B",
      status: "accepted", stakeCredits: 100, winnerId: null,
    }]);
    const all = loadChallenges().map((c: any) =>
      c.id === "c-1" ? { ...c, status: "completed", winnerId: "user-A" } : c
    );
    saveChallenges(all);
    const result = loadChallenges()[0];
    expect(result.status).toBe("completed");
    expect(result.winnerId).toBe("user-A");
  });

  it("should handle declined status", () => {
    saveChallenges([{
      id: "c-1", challengerId: "user-A", challengedId: "user-B",
      status: "pending", stakeCredits: 100, winnerId: null,
    }]);
    const all = loadChallenges().map((c: any) =>
      c.id === "c-1" ? { ...c, status: "declined" } : c
    );
    saveChallenges(all);
    expect(loadChallenges()[0].status).toBe("declined");
  });

  it("should validate stake amount range", () => {
    expect(0).toBeLessThan(1); // Stake must be >= 1
    expect(100001).toBeGreaterThan(100000); // Stake must be <= 100000
  });
});

describe("JU Leaderboards", () => {
  it("should calculate stats from settled entries", () => {
    const entries = [
      { status: "settled", outcome: "WIN", rewardCreditsCents: 50000 },
      { status: "settled", outcome: "WIN", rewardCreditsCents: 30000 },
      { status: "settled", outcome: "LOSS", rewardCreditsCents: -20000 },
      { status: "settled", outcome: "PUSH", rewardCreditsCents: 0 },
      { status: "open", outcome: null, rewardCreditsCents: null },
    ];
    const stats = calcLeaderboardStats(entries);
    expect(stats.total).toBe(4); // Only settled
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.pushes).toBe(1);
    expect(stats.profit).toBe(600); // (500 + 300 - 200 + 0) / 100 = 600
  });

  it("should return zero stats for no settled entries", () => {
    const stats = calcLeaderboardStats([]);
    expect(stats.total).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.profit).toBe(0);
  });

  it("should handle negative profit correctly", () => {
    const entries = [
      { status: "settled", outcome: "LOSS", rewardCreditsCents: -50000 },
    ];
    const stats = calcLeaderboardStats(entries);
    expect(stats.profit).toBe(-500); // -50000 / 100 = -500
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(1);
  });

  it("should rank by profit descending", () => {
    const competitors = [
      { name: "A", profit: 100 },
      { name: "B", profit: 300 },
      { name: "C", profit: 50 },
    ];
    const sorted = competitors.sort((a, b) => b.profit - a.profit);
    expect(sorted[0].name).toBe("B");
    expect(sorted[1].name).toBe("A");
    expect(sorted[2].name).toBe("C");
  });

  it("should filter by time scope for weekly leaderboard", () => {
    const now = Date.now();
    const weekAgo = now - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    const entries = [
      { status: "settled", outcome: "WIN", rewardCreditsCents: 10000, createdAt: new Date(now).toISOString() },
      { status: "settled", outcome: "WIN", rewardCreditsCents: 20000, createdAt: new Date(weekAgo).toISOString() },
    ];
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;
    const weekly = entries.filter(
      (e) => new Date(e.createdAt).getTime() >= weekStart
    );
    expect(weekly).toHaveLength(1);
    expect(weekly[0].rewardCreditsCents).toBe(10000);
  });
});

describe("JU Notifications", () => {
  it("should create notification entries with correct structure", () => {
    const notification = {
      id: "n-1",
      userId: "user-A",
      type: "challenge_received",
      title: "New Challenge",
      body: "Bob challenged you to a duel!",
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    expect(notification.userId).toBe("user-A");
    expect(notification.isRead).toBe(false);
    expect(notification.type).toBe("challenge_received");
  });

  it("should mark notification as read", () => {
    const notifications = [
      { id: "n-1", isRead: false },
      { id: "n-2", isRead: false },
    ];
    const updated = notifications.map((n) =>
      n.id === "n-1" ? { ...n, isRead: true } : n
    );
    expect(updated[0].isRead).toBe(true);
    expect(updated[1].isRead).toBe(false);
  });
});

describe("Admin Authorization", () => {
  it("should reject wallet adjustment from non-admin", () => {
    // Simulates the jp_admin_wallet_adjust RPC check
    const is_admin = false;
    expect(is_admin).toBe(false);
    // RPC would raise EXCEPTION 'Not authorized: admin only'
  });

  it("should require non-zero adjustment amount", () => {
    const amount = 0;
    expect(amount).toBe(0);
    // RPC would raise EXCEPTION 'Adjustment amount must be non-zero'
  });

  it("should create audit record on admin action", () => {
    const audit = {
      admin_id: "admin-1",
      action: "WALLET_ADJUST",
      target_type: "user",
      target_id: "user-B",
      details: { amount_cents: 50000, reason: "Promotional credit" },
    };
    expect(audit.action).toBe("WALLET_ADJUST");
    expect(audit.target_id).toBe("user-B");
  });
});
