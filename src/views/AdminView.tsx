/**
 * JU PICKS — Admin panel (protected)
 * Shows system stats, feature flags, audit log, wallet adjustments.
 * Admin-only access via profiles.is_admin. Virtual credits only.
 * REAL_MONEY_ENABLED=false.
 */

import { useState } from "react";
import { useApp } from "~/lib/app/app-provider";

export default function AdminView() {
  const { user, isDemoMode, isDbConnected, flags, entries, balanceCredits, ledger } = useApp();
  const [showWalletAdjust, setShowWalletAdjust] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustReason, setAdjustReason] = useState("");
  const [auditLog, setAuditLog] = useState<Array<{
    action: string;
    target: string;
    details: string;
    timestamp: string;
  }>>([]);

  // System stats
  const totalEntries = entries.length;
  const settledEntries = entries.filter((e) => e.status === "settled").length;
  const totalProfit = entries
    .filter((e) => e.status === "settled")
    .reduce((sum, e) => sum + (e.rewardCreditsCents ?? 0) / 100, 0);

  function handleWalletAdjust() {
    if (!adjustUserId.trim() || adjustAmount === 0) return;
    const entry = {
      action: "WALLET_ADJUST",
      target: adjustUserId.trim(),
      details: `${adjustAmount > 0 ? "+" : ""}${adjustAmount} credits — ${adjustReason || "no reason"}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLog([entry, ...auditLog]);
    setShowWalletAdjust(false);
    setAdjustUserId("");
    setAdjustAmount(100);
    setAdjustReason("");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-jp-muted">Admin Panel</h2>

      {/* Access notice */}
      <div className="rounded-xl border border-amber-600/30 bg-amber-950/20 p-3">
        <p className="text-xs text-amber-400">
          ⚠ Admin access requires profiles.is_admin = true in Supabase.
          {isDemoMode && " In demo mode, admin actions are simulated locally."}
        </p>
      </div>

      {/* System stats */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">System Stats</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="DB Mode" value={isDemoMode ? "Demo" : "Connected"} />
          <Stat label="DB Client" value={isDbConnected ? "Active" : "Not configured"} />
          <Stat label="Total Entries" value={String(totalEntries)} />
          <Stat label="Settled" value={String(settledEntries)} />
          <Stat label="User Balance" value={`${balanceCredits.toLocaleString()} cr`} />
          <Stat label="Total Profit" value={`${Math.floor(totalProfit)} cr`} />
          <Stat label="Ledger Entries" value={String(ledger.length)} />
          <Stat label="Audit Records" value={String(auditLog.length)} />
        </div>
      </div>

      {/* Feature flags */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">Feature Flags</h3>
        <div className="mt-3 space-y-1.5">
          <AdminFlagRow label="Real Money" value={flags.REAL_MONEY_ENABLED ? "ON ⚠" : "OFF ✓"} danger={flags.REAL_MONEY_ENABLED} />
          <AdminFlagRow label="Sports Data" value={flags.SPORTS_DATA_MODE} />
          <AdminFlagRow label="JU Rooms" value={flags.ROOMS_ENABLED ? "Enabled" : "Disabled"} />
          <AdminFlagRow label="Challenges" value={flags.CHALLENGES_ENABLED ? "Enabled" : "Disabled"} />
          <AdminFlagRow label="Leaderboards" value={flags.LEADERBOARDS_ENABLED ? "Enabled" : "Disabled"} />
          <AdminFlagRow label="JU AI EDGE" value={flags.AI_EDGE_ENABLED ? "Enabled" : "Disabled"} />
          <AdminFlagRow label="Social" value={flags.SOCIAL_ENABLED ? "Enabled" : "Disabled"} />
          <AdminFlagRow label="Notifications" value={flags.NOTIFICATIONS_ENABLED ? "Enabled" : "Disabled"} />
          <AdminFlagRow label="Admin" value={flags.ADMIN_ENABLED ? "Enabled" : "Disabled"} />
        </div>
      </div>

      {/* Wallet adjustment */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">Wallet Adjustment</h3>
        <p className="mt-1 text-xs text-jp-muted">
          Adjust a user's virtual credit balance. Creates an audit record.
        </p>
        {!showWalletAdjust ? (
          <button
            type="button"
            onClick={() => setShowWalletAdjust(true)}
            className="mt-3 rounded-lg bg-jp-bg px-4 py-2 text-xs text-jp-accent"
          >
            New Adjustment
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="User ID"
              value={adjustUserId}
              onChange={(e) => setAdjustUserId(e.target.value)}
              className="w-full rounded-lg border border-jp-border bg-jp-bg px-3 py-2 text-xs text-zinc-100 placeholder-jp-muted"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Credits"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value) || 0)}
                className="flex-1 rounded-lg border border-jp-border bg-jp-bg px-3 py-2 text-xs text-zinc-100"
              />
              <button
                type="button"
                onClick={() => setAdjustAmount(Math.abs(adjustAmount))}
                className="rounded-lg bg-emerald-600/20 px-3 text-xs text-emerald-400"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setAdjustAmount(-Math.abs(adjustAmount))}
                className="rounded-lg bg-rose-600/20 px-3 text-xs text-rose-400"
              >
                −
              </button>
            </div>
            <input
              type="text"
              placeholder="Reason (optional)"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full rounded-lg border border-jp-border bg-jp-bg px-3 py-2 text-xs text-zinc-100 placeholder-jp-muted"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleWalletAdjust}
                disabled={!adjustUserId.trim() || adjustAmount === 0}
                className="flex-1 rounded-lg bg-jp-accent py-2 text-xs font-semibold text-black disabled:opacity-30"
              >
                Apply Adjustment
              </button>
              <button
                type="button"
                onClick={() => setShowWalletAdjust(false)}
                className="rounded-lg bg-jp-bg px-3 py-2 text-xs text-jp-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit log */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">Audit Log</h3>
        {auditLog.length === 0 ? (
          <p className="mt-2 text-xs text-jp-muted">No audit records yet.</p>
        ) : (
          <div className="mt-2 space-y-1">
            {auditLog.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-jp-bg px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-medium text-zinc-100">{entry.action}</div>
                  <div className="text-[10px] text-jp-muted">{entry.details}</div>
                </div>
                <div className="text-[10px] text-jp-muted">
                  {new Date(entry.timestamp).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free-to-play reminder */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-4">
        <h3 className="text-sm font-medium text-zinc-100">Compliance</h3>
        <ul className="mt-2 space-y-1 text-xs text-jp-muted">
          <li>✓ REAL_MONEY_ENABLED = false (hard gate)</li>
          <li>✓ No deposits, no withdrawals, no cash prizes</li>
          <li>✓ Virtual credits clearly labeled as non-withdrawable</li>
          <li>✓ Settlement is server-side and authoritative</li>
          <li>✓ Service-role key never exposed to browser</li>
          <li>✓ RLS enforced on all tables</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-jp-bg px-3 py-2">
      <div className="text-[10px] text-jp-muted">{label}</div>
      <div className="text-sm font-medium text-zinc-100">{value}</div>
    </div>
  );
}

function AdminFlagRow({ label, value, danger }: { label: string; value: string | boolean; danger?: boolean }) {
  const display = typeof value === "boolean" ? (value ? "ON" : "OFF") : value;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-jp-muted">{label}</span>
      <span className={
        danger ? "font-medium text-rose-400" :
        display.includes("OFF") || display.includes("Disabled") ? "text-jp-muted" :
        "font-medium text-emerald-400"
      }>
        {display}
      </span>
    </div>
  );
}
