/**
 * JU PICKS — Notifications view
 * Shows challenge invites, settlement results, room invites, leaderboard updates.
 * Works in demo mode (localStorage) and connected mode (Supabase RPCs).
 * Virtual credits only. REAL_MONEY_ENABLED=false.
 */

import { useState, useEffect } from "react";
import { useApp } from "~/lib/app/app-provider";

interface Notification {
  id: string;
  type: "challenge_received" | "challenge_accepted" | "challenge_result" |
        "entry_settled" | "room_invite" | "leaderboard_update" | "welcome";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const STORAGE_KEY = "ju_picks_notifications";

function loadNotifications(): Notification[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveNotifications(n: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
}

export function addNotification(n: Omit<Notification, "id" | "createdAt" | "isRead">): void {
  const all = loadNotifications();
  all.unshift({
    ...n,
    id: "notif-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  // Keep last 50 notifications
  saveNotifications(all.slice(0, 50));
}

export function getUnreadCount(): number {
  return loadNotifications().filter((n) => !n.isRead).length;
}

export default function NotificationsView({ onClose }: { onClose?: () => void }) {
  const { user, isDemoMode } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setNotifications(loadNotifications());
  }, []);

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    saveNotifications(updated);
    setNotifications(updated);
  }

  function markRead(id: string) {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    saveNotifications(updated);
    setNotifications(updated);
  }

  function clearAll() {
    saveNotifications([]);
    setNotifications([]);
  }

  function seedDemoNotifications() {
    addNotification({
      type: "welcome",
      title: "Welcome to JU PICKS!",
      body: "You've been credited 10,000 virtual play credits. Make your first pick on the Board!",
    });
    addNotification({
      type: "leaderboard_update",
      title: "Leaderboard Updated",
      body: "Weekly leaderboard has been refreshed. Check your rank on the Play tab!",
    });
    addNotification({
      type: "challenge_received",
      title: "New Challenge",
      body: "ShowtimeJay challenged you to a head-to-head duel for 100 credits.",
    });
    setNotifications(loadNotifications());
  }

  function iconFor(type: Notification["type"]): string {
    switch (type) {
      case "challenge_received": return "🎮";
      case "challenge_accepted": return "✅";
      case "challenge_result": return "🏆";
      case "entry_settled": return "💰";
      case "room_invite": return "🏠";
      case "leaderboard_update": return "📊";
      case "welcome": return "👋";
      default: return "🔔";
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-jp-muted">
          Notifications {unreadCount > 0 && (
            <span className="ml-1 rounded-full bg-jp-accent px-1.5 text-[10px] font-bold text-black">
              {unreadCount}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-jp-accent"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-jp-muted hover:text-rose-400"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-jp-border bg-jp-card p-6 text-center">
          <p className="text-sm text-jp-muted">No notifications yet.</p>
          {isDemoMode && (
            <button
              type="button"
              onClick={seedDemoNotifications}
              className="mt-3 rounded-lg bg-jp-card px-4 py-2 text-xs text-jp-accent"
            >
              Add demo notifications
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n.id)}
              className={
                "w-full rounded-xl border p-3 text-left " +
                (n.isRead
                  ? "border-jp-border bg-jp-card"
                  : "border-jp-accent/30 bg-jp-accent/5")
              }
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{iconFor(n.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-100">{n.title}</span>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-jp-accent" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-jp-muted">{n.body}</p>
                  <p className="mt-1 text-[10px] text-jp-muted">
                    {new Date(n.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isDemoMode && (
        <p className="text-center text-[10px] text-jp-muted">
          Demo mode — notifications are stored in your browser.
        </p>
      )}
    </div>
  );
}
