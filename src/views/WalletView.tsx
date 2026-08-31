/**
 * JU PICKS — Wallet view: balance, ledger, entries history
 */

import { useApp } from "~/lib/app/app-provider";

export default function WalletView() {
  const { balanceCredits, ledger, entries, isDemoMode, settleDemoEntry } = useApp();

  function formatType(type: string): { label: string; color: string } {
    switch (type) {
      case "STARTING_CREDIT":
        return { label: "Starting Credits", color: "text-emerald-400" };
      case "ENTRY_STAKE":
        return { label: "Entry Stake", color: "text-rose-400" };
      case "ENTRY_WIN":
        return { label: "Entry Win", color: "text-emerald-400" };
      case "ENTRY_REFUND":
        return { label: "Refund", color: "text-amber-400" };
      case "ADMIN_ADJUSTMENT":
        return { label: "Admin Adjustment", color: "text-blue-400" };
      default:
        return { label: type, color: "text-jp-muted" };
    }
  }

  function formatAmount(cents: number): string {
    const credits = cents / 100;
    const sign = credits > 0 ? "+" : "";
    return sign + credits.toLocaleString() + " cr";
  }

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="rounded-xl border border-jp-border bg-jp-card p-6 text-center">
        <div className="text-3xl font-bold text-jp-accent">
          {balanceCredits.toLocaleString()}
        </div>
        <div className="mt-1 text-sm text-jp-muted">virtual credits</div>
        <p className="mt-3 text-[10px] text-jp-muted">
          No cash value. Not redeemable. No deposits or withdrawals.
        </p>
      </div>

      {/* Entries history */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-jp-muted">My Entries</h2>
        {entries.length === 0 ? (
          <div className="rounded-xl border border-jp-border bg-jp-card p-6 text-center">
            <p className="text-sm text-jp-muted">No entries yet.</p>
            <p className="mt-1 text-xs text-jp-muted">
              Submit picks from the Board to see your entry history here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.entryId}
                className="rounded-xl border border-jp-border bg-jp-card p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={
                      "rounded px-2 py-0.5 text-[10px] font-semibold " +
                      statusClass(entry.status)
                    }>
                      {entry.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-jp-muted">
                      {entry.mode}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-100">
                    {Math.floor(entry.entryAmountCents / 100)} cr
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {entry.picks.map((pick) => (
                    <div key={pick.projectionId} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-100">
                        {pick.playerName ?? "Unknown"} <span className="text-jp-muted">{pick.statType}</span>
                      </span>
                      <span className={
                        "font-medium " +
                        (pick.direction === "HIGHER" ? "text-emerald-400" : "text-rose-400")
                      }>
                        {pick.direction} {pick.lockedLine ?? pick.line}
                        {pick.outcome && (
                          <span className={
                            "ml-1 " +
                            (pick.outcome === "WIN" ? "text-emerald-400" :
                             pick.outcome === "LOSS" ? "text-rose-400" :
                             "text-jp-muted")
                          }>
                            → {pick.outcome}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {entry.outcome && (
                  <div className="mt-2 text-xs text-jp-muted">
                    Result: <span className={
                      entry.outcome === "WIN" ? "text-emerald-400 font-medium" :
                      entry.outcome === "LOSS" ? "text-rose-400 font-medium" :
                      "text-jp-muted font-medium"
                    }>{entry.outcome}</span>
                    {entry.rewardCreditsCents !== null && entry.rewardCreditsCents > 0 && (
                      <span className="ml-2 text-emerald-400">
                        +{Math.floor(entry.rewardCreditsCents / 100)} cr
                      </span>
                    )}
                  </div>
                )}
                {isDemoMode && entry.status === "open" && (
                  <DemoSettleButton
                    entryId={entry.entryId}
                    picks={entry.picks}
                    onSettle={settleDemoEntry}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ledger */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-jp-muted">Transaction History</h2>
        {ledger.length === 0 ? (
          <p className="text-xs text-jp-muted">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {ledger.map((entry) => {
              const t = formatType(entry.type);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-jp-card px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-medium text-zinc-100">{t.label}</div>
                    <div className="text-[10px] text-jp-muted">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                      {entry.reason && " · " + entry.reason}
                    </div>
                  </div>
                  <div className={"font-medium " + t.color}>
                    {formatAmount(entry.amountCents)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function statusClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-600/20 text-blue-400";
    case "settled":
      return "bg-zinc-600/30 text-zinc-300";
    case "void":
      return "bg-amber-600/20 text-amber-400";
    case "cancelled":
      return "bg-rose-600/20 text-rose-400";
    default:
      return "bg-jp-border text-jp-muted";
  }
}

function DemoSettleButton({
  entryId,
  picks,
  onSettle,
}: {
  entryId: string;
  picks: Array<{ projectionId: string; line: number | null; lockedLine: number | null; direction: string }>;
  onSettle: (entryId: string, outcomes: Array<{ projectionId: string; actualValue: number; isFinal: boolean; isVoid: boolean }>) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        // Simulate results: random values around the line
        const outcomes = picks.map((p) => {
          const line = p.lockedLine ?? p.line ?? 0;
          // Random: 60% chance of going in the pick direction
          const variance = line * 0.15 + 5;
          const actual = line + (Math.random() - 0.4) * variance * 2;
          return {
            projectionId: p.projectionId,
            actualValue: Math.round(Math.max(0, actual) * 10) / 10,
            isFinal: true,
            isVoid: false,
          };
        });
        onSettle(entryId, outcomes);
      }}
      className="mt-2 w-full rounded-lg bg-jp-bg py-2 text-[10px] font-medium text-jp-accent hover:bg-jp-border"
    >
      Settle (demo simulation)
    </button>
  );
}
