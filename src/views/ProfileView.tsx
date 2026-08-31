/**
 * JU PICKS — Profile view: auth, settings, feature flags
 */

import { useApp } from "~/lib/app/app-provider";

interface ProfileViewProps {
  onAdmin?: () => void;
}

export default function ProfileView({ onAdmin }: ProfileViewProps = {}) {
  const { user, isDemoMode, isDbConnected, signOut, flags } = useApp();

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-medium text-jp-muted">Profile</h2>

      {/* User card */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-zinc-100">{user?.name ?? "Guest"}</div>
            <div className="text-xs text-jp-muted">{user?.email ?? "—"}</div>
          </div>
          <span className={
            "rounded px-2 py-1 text-[10px] font-semibold " +
            (isDemoMode
              ? "bg-amber-600/20 text-amber-400"
              : "bg-emerald-600/20 text-emerald-400")
          }>
            {isDemoMode ? "DEMO" : "CONNECTED"}
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          {!isDemoMode && (
            <button
              type="button"
              onClick={() => signOut()}
              className="flex-1 rounded-lg bg-jp-bg py-2 text-xs font-medium text-jp-muted hover:text-rose-400"
            >
              Sign Out
            </button>
          )}
          {isDemoMode && (
            <div className="flex-1 rounded-lg bg-jp-bg px-3 py-2 text-[10px] text-jp-muted">
              Demo mode — data is stored locally in your browser. Configure Supabase for persistent accounts.
            </div>
          )}
        </div>
      </div>

      {/* Free-to-play notice */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">Free-to-Play</h3>
        <ul className="mt-2 space-y-1 text-xs text-jp-muted">
          <li>✓ Virtual credits only — no cash, no deposits, no withdrawals</li>
          <li>✓ REAL_MONEY_ENABLED = false (hard gate)</li>
          <li>✓ Credits have no cash value and are not redeemable</li>
          <li>✓ Settlement is authoritative and server-verified</li>
        </ul>
      </div>

      {/* Feature flags */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">Feature Flags</h3>
        <div className="mt-2 space-y-1.5">
          <FlagRow label="Real Money" value={flags.REAL_MONEY_ENABLED ? "ON" : "OFF"} danger={flags.REAL_MONEY_ENABLED} />
          <FlagRow label="Sports Data" value={flags.SPORTS_DATA_MODE} />
          <FlagRow label="JU Rooms" value={flags.ROOMS_ENABLED ? "Enabled" : "Disabled"} />
          <FlagRow label="Challenges" value={flags.CHALLENGES_ENABLED ? "Enabled" : "Disabled"} />
          <FlagRow label="Leaderboards" value={flags.LEADERBOARDS_ENABLED ? "Enabled" : "Disabled"} />
          <FlagRow label="JU AI EDGE" value={flags.AI_EDGE_ENABLED ? "Enabled" : "Disabled"} />
          <FlagRow label="Social" value={flags.SOCIAL_ENABLED ? "Enabled" : "Disabled"} />
          <FlagRow label="Admin" value={flags.ADMIN_ENABLED ? "Enabled" : "Disabled"} />
          <FlagRow label="Notifications" value={flags.NOTIFICATIONS_ENABLED ? "Enabled" : "Disabled"} />
        </div>
      </div>

      {/* Admin access */}
      {onAdmin && flags?.ADMIN_ENABLED && (
        <button
          type="button"
          onClick={onAdmin}
          className="w-full rounded-xl border border-jp-border bg-jp-card py-3 text-sm font-medium text-jp-accent"
        >
          Admin Panel →
        </button>
      )}

      {/* DB status */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">Database Status</h3>
        <div className="mt-2 text-xs text-jp-muted">
          <div>Mode: {isDemoMode ? "Demo (local browser storage)" : "Connected (Supabase)"}</div>
          <div>DB Client: {isDbConnected ? "Registered" : "Not configured"}</div>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">About JU PICKS</h3>
        <p className="mt-1 text-xs text-jp-muted">
          JU PICKS is a free-to-play sports prediction platform. Make Higher/Lower
          picks on player props, build entries, compete with friends, and climb
          leaderboards — all with virtual credits.
        </p>
        <p className="mt-2 text-[10px] text-jp-muted">
          Original product. Not affiliated with any sportsbook.
          Virtual credits have no cash value.
        </p>
      </div>
    </div>
  );
}

function FlagRow({ label, value, danger }: { label: string; value: string | boolean; danger?: boolean }) {
  const display = typeof value === "boolean" ? (value ? "ON" : "OFF") : value;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-jp-muted">{label}</span>
      <span className={
        danger ? "font-medium text-rose-400" :
        display === "OFF" || display === "Disabled" ? "text-jp-muted" :
        "font-medium text-emerald-400"
      }>
        {display}
      </span>
    </div>
  );
}
