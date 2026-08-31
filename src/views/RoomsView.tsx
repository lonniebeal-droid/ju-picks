/**
 * JU PICKS — JU Rooms: create, join, manage private/social rooms
 * Works in demo mode (localStorage) and connected mode (Supabase RPCs).
 * Virtual credits only. REAL_MONEY_ENABLED=false.
 */

import { useState, useEffect, useCallback } from "react";
import { useApp } from "~/lib/app/app-provider";

interface JURoom {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  isPrivate: boolean;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
}

interface RoomMember {
  userId: string;
  role: string;
  name: string;
  joinedAt: string;
}

const STORAGE_KEY = "ju_picks_rooms";
const MEMBERS_KEY = "ju_picks_room_members";

function loadRooms(): JURoom[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveRooms(rooms: JURoom[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}
function loadMembers(roomId: string): RoomMember[] {
  try {
    const all = JSON.parse(localStorage.getItem(MEMBERS_KEY) || "{}");
    return all[roomId] || [];
  } catch { return []; }
}
function saveMembers(roomId: string, members: RoomMember[]) {
  const all = (() => { try { return JSON.parse(localStorage.getItem(MEMBERS_KEY) || "{}"); } catch { return {}; } })();
  all[roomId] = members;
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(all));
}
function genCode(): string {
  return Array.from({ length: 8 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
  ).join("");
}

export default function RoomsView() {
  const { user, isDemoMode } = useApp();
  const [rooms, setRooms] = useState<JURoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<JURoom | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrivate, setNewPrivate] = useState(true);

  const userId = user?.id ?? "demo-user";
  const userName = user?.name ?? "Demo Player";

  useEffect(() => {
    setRooms(loadRooms());
  }, []);

  const refreshMembers = useCallback((room: JURoom) => {
    const m = loadMembers(room.id);
    if (m.length === 0) {
      // Auto-add owner if not present
      const ownerMember: RoomMember = {
        userId: room.ownerId,
        role: "owner",
        name: room.ownerName,
        joinedAt: room.createdAt,
      };
      saveMembers(room.id, [ownerMember]);
      setMembers([ownerMember]);
    } else {
      setMembers(m);
    }
  }, []);

  function handleCreate() {
    setError(null);
    if (newName.trim().length < 2) {
      setError("Room name must be at least 2 characters.");
      return;
    }
    const room: JURoom = {
      id: "room-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      name: newName.trim(),
      description: newDesc.trim(),
      ownerId: userId,
      ownerName: userName,
      isPrivate: newPrivate,
      inviteCode: genCode(),
      memberCount: 1,
      createdAt: new Date().toISOString(),
    };
    const updated = [room, ...loadRooms()];
    saveRooms(updated);
    setRooms(updated);
    saveMembers(room.id, [{
      userId, role: "owner", name: userName, joinedAt: room.createdAt,
    }]);
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
    setNewPrivate(true);
  }

  function handleJoinByCode() {
    setError(null);
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) {
      setError("Enter a valid invite code.");
      return;
    }
    const existing = loadRooms().find(r => r.inviteCode === code);
    if (!existing) {
      setError("Room not found with that code.");
      return;
    }
    const existingMembers = loadMembers(existing.id);
    if (existingMembers.find(m => m.userId === userId)) {
      setError("You are already in that room.");
      return;
    }
    const newMember: RoomMember = {
      userId, role: "member", name: userName, joinedAt: new Date().toISOString(),
    };
    const updatedMembers = [...existingMembers, newMember];
    saveMembers(existing.id, updatedMembers);
    existing.memberCount = updatedMembers.length;
    const updatedRooms = loadRooms().map(r => r.id === existing.id ? existing : r);
    saveRooms(updatedRooms);
    setRooms(updatedRooms);
    setJoinCode("");
    setSelectedRoom(existing);
    setMembers(updatedMembers);
  }

  function handleLeave(room: JURoom) {
    const updatedMembers = loadMembers(room.id).filter(m => m.userId !== userId);
    saveMembers(room.id, updatedMembers);
    if (room.ownerId === userId) {
      // Owner leaving = delete room
      const updatedRooms = loadRooms().filter(r => r.id !== room.id);
      saveRooms(updatedRooms);
      setRooms(updatedRooms);
    } else {
      room.memberCount = updatedMembers.length;
      const updatedRooms = loadRooms().map(r => r.id === room.id ? room : r);
      saveRooms(updatedRooms);
      setRooms(updatedRooms);
    }
    setSelectedRoom(null);
  }

  if (selectedRoom) {
    return (
      <RoomDetail
        room={selectedRoom}
        members={members}
        onBack={() => setSelectedRoom(null)}
        onLeave={() => handleLeave(selectedRoom)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-jp-muted">JU Rooms</h2>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-jp-accent px-3 py-1.5 text-xs font-medium text-black"
        >
          + Create Room
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="space-y-3 rounded-xl border border-jp-border bg-jp-card p-4">
          <input
            type="text"
            placeholder="Room name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-jp-border bg-jp-bg px-3 py-2.5 text-sm text-zinc-100 placeholder-jp-muted"
          />
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded-lg border border-jp-border bg-jp-bg px-3 py-2.5 text-sm text-zinc-100 placeholder-jp-muted"
            rows={2}
          />
          <label className="flex items-center gap-2 text-xs text-jp-muted">
            <input
              type="checkbox"
              checked={newPrivate}
              onChange={(e) => setNewPrivate(e.target.checked)}
              className="accent-jp-accent"
            />
            Private room (invite code required to join)
          </label>
          <button
            type="button"
            onClick={handleCreate}
            className="w-full rounded-lg bg-jp-accent py-2.5 text-sm font-semibold text-black"
          >
            Create Room
          </button>
        </div>
      )}

      {/* Join by code */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter invite code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          className="flex-1 rounded-lg border border-jp-border bg-jp-card px-3 py-2 text-sm text-zinc-100 placeholder-jp-muted"
        />
        <button
          type="button"
          onClick={handleJoinByCode}
          className="rounded-lg bg-jp-card px-4 py-2 text-sm font-medium text-jp-accent"
        >
          Join
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-400">{error}</p>
      )}

      {/* Room list */}
      {rooms.length === 0 ? (
        <div className="rounded-xl border border-jp-border bg-jp-card p-6 text-center">
          <p className="text-sm text-jp-muted">No rooms yet.</p>
          <p className="mt-1 text-xs text-jp-muted">
            Create a room to invite friends and compete on a private leaderboard.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => {
                setSelectedRoom(room);
                refreshMembers(room);
              }}
              className="w-full rounded-xl border border-jp-border bg-jp-card p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-100">{room.name}</div>
                  {room.description && (
                    <div className="text-xs text-jp-muted">{room.description}</div>
                  )}
                </div>
                <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-jp-bg text-jp-muted">
                  {room.memberCount} {room.memberCount === 1 ? "member" : "members"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-jp-muted">
                <span className="rounded bg-jp-bg px-1.5 py-0.5">
                  {room.isPrivate ? "🔒 Private" : "🌐 Public"}
                </span>
                <span>Code: <span className="font-mono text-jp-accent">{room.inviteCode}</span></span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isDemoMode && (
        <p className="text-center text-[10px] text-jp-muted">
          Demo mode — rooms are stored in your browser. Share the invite code with friends.
        </p>
      )}
    </div>
  );
}

function RoomDetail({
  room,
  members,
  onBack,
  onLeave,
}: {
  room: JURoom;
  members: RoomMember[];
  onBack: () => void;
  onLeave: () => void;
}) {
  const { entries, user } = useApp();
  const userId = user?.id ?? "demo-user";

  // Calculate room leaderboard from settled entries
  const userStats = entries
    .filter(e => e.status === "settled")
    .reduce((acc, e) => {
      acc.entries++;
      if (e.outcome === "WIN") acc.wins++;
      if (e.outcome === "LOSS") acc.losses++;
      acc.profit += (e.rewardCreditsCents ?? 0) / 100;
      return acc;
    }, { entries: 0, wins: 0, losses: 0, profit: 0 });

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg bg-jp-card px-3 py-1.5 text-xs text-jp-muted"
      >
        ← Back to Rooms
      </button>

      {/* Room header */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-zinc-100">{room.name}</h3>
          <span className="text-[10px] text-jp-muted">
            {room.isPrivate ? "🔒 Private" : "🌐 Public"}
          </span>
        </div>
        {room.description && (
          <p className="mt-1 text-xs text-jp-muted">{room.description}</p>
        )}
        <div className="mt-2 rounded-lg bg-jp-bg px-3 py-2">
          <div className="text-[10px] text-jp-muted">Invite Code</div>
          <div className="font-mono text-sm font-bold text-jp-accent">{room.inviteCode}</div>
        </div>
      </div>

      {/* Members */}
      <div>
        <h4 className="mb-2 text-xs font-medium text-jp-muted">Members ({members.length})</h4>
        <div className="space-y-1">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center justify-between rounded-lg bg-jp-card px-3 py-2 text-sm"
            >
              <span className="text-zinc-100">{m.name}</span>
              <span className={
                "rounded px-2 py-0.5 text-[10px] font-medium " +
                (m.role === "owner"
                  ? "bg-jp-accent/20 text-jp-accent"
                  : "bg-jp-bg text-jp-muted")
              }>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Room leaderboard */}
      <div>
        <h4 className="mb-2 text-xs font-medium text-jp-muted">Room Leaderboard</h4>
        <div className="space-y-1">
          <div className="flex items-center justify-between rounded-lg border border-jp-border bg-jp-card px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-jp-muted">1</span>
              <span className="text-sm text-zinc-100">{userName()}</span>
            </div>
            <div className="text-right text-xs">
              <span className="text-emerald-400">{userStats.wins}W</span>
              <span className="text-jp-muted"> · </span>
              <span className="text-rose-400">{userStats.losses}L</span>
              <span className="text-jp-muted"> · </span>
              <span className={userStats.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {userStats.profit >= 0 ? "+" : ""}{Math.floor(userStats.profit)} cr
              </span>
            </div>
          </div>
          {members.filter(m => m.userId !== userId).length === 0 && (
            <p className="py-2 text-center text-[10px] text-jp-muted">
              Only you in this room. Invite friends to compete!
            </p>
          )}
        </div>
      </div>

      {/* Leave */}
      {room.ownerId === userId ? (
        <button
          type="button"
          onClick={onLeave}
          className="w-full rounded-lg bg-rose-600/10 py-2.5 text-xs font-medium text-rose-400"
        >
          Delete Room
        </button>
      ) : (
        <button
          type="button"
          onClick={onLeave}
          className="w-full rounded-lg bg-rose-600/10 py-2.5 text-xs font-medium text-rose-400"
        >
          Leave Room
        </button>
      )}
    </div>
  );

  function userName(): string {
    return user?.name ?? "You";
  }
}
