/**
 * JU PICKS — Slip view: entry builder + submit
 */

import { useState } from "react";
import { useApp } from "~/lib/app/app-provider";

export default function SlipView() {
  const {
    builderPicks,
    builderMode,
    builderAmount,
    removeBuilderPick,
    setBuilderMode,
    setBuilderAmount,
    clearBuilder,
    submitEntry,
    balanceCredits,
    isDemoMode,
  } = useApp();

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Default contest type ID for demo mode
  const contestTypeId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  // Simple multiplier estimate: FLEX = 2x, POWER = 3x (display only)
  const multiplier = builderMode === "POWER" ? 3 : 2;
  const potentialReward = builderAmount > 0 && builderPicks.length > 0
    ? Math.floor(builderAmount * multiplier)
    : 0;

  // Validation
  const canSubmit = builderPicks.length >= 1 && builderAmount >= 1 && builderAmount <= balanceCredits;

  async function handleSubmit() {
    setSubmitting(true);
    setFeedback(null);
    const result = await submitEntry(contestTypeId);
    setSubmitting(false);
    if (result.success) {
      setFeedback({
        type: "success",
        message: "Entry submitted! " + builderPicks.length + " picks for " + builderAmount + " credits.",
      });
    } else {
      setFeedback({ type: "error", message: result.error || "Submission failed" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-jp-muted">Entry Slip</h2>
        {builderPicks.length > 0 && (
          <button
            type="button"
            onClick={clearBuilder}
            className="text-xs text-jp-muted hover:text-rose-400"
          >
            Clear all
          </button>
        )}
      </div>

      {builderPicks.length === 0 ? (
        <div className="rounded-xl border border-jp-border bg-jp-card p-8 text-center">
          <p className="text-sm text-jp-muted">No picks yet.</p>
          <p className="mt-1 text-xs text-jp-muted">
            Go to the Board and tap Higher or Lower on a player prop to add picks.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {builderPicks.map((pk) => (
            <li
              key={pk.projectionId}
              className="flex items-center justify-between rounded-lg border border-jp-border bg-jp-card px-3 py-2.5 text-sm"
            >
              <div>
                <span className="font-medium text-zinc-100">{pk.playerName}</span>
                <span className="ml-2 text-xs text-jp-muted">{pk.statType} {pk.line}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={
                  "rounded px-2 py-0.5 text-xs font-semibold " +
                  (pk.direction === "HIGHER"
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "bg-rose-600/20 text-rose-400")
                }>
                  {pk.direction}
                </span>
                <button
                  type="button"
                  className="text-xs text-jp-muted hover:text-rose-400"
                  onClick={() => removeBuilderPick(pk.projectionId)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setBuilderMode("FLEX")}
          className={"flex-1 rounded-lg py-2.5 text-sm font-medium " +
            (builderMode === "FLEX" ? "bg-jp-accent text-black" : "bg-jp-card text-jp-muted")}
        >
          Flex
        </button>
        <button
          type="button"
          onClick={() => setBuilderMode("POWER")}
          className={"flex-1 rounded-lg py-2.5 text-sm font-medium " +
            (builderMode === "POWER" ? "bg-jp-accent text-black" : "bg-jp-card text-jp-muted")}
        >
          Power (3x)
        </button>
      </div>
      <p className="text-[10px] text-jp-muted">
        {builderMode === "FLEX"
          ? "Flex: all picks must win (or push) to win. 2x reward."
          : "Power: all picks must win (no pushes) to win. 3x reward."}
      </p>

      {/* Amount input */}
      <label className="block">
        <span className="text-sm text-jp-muted">Entry amount (virtual credits)</span>
        <input
          type="number"
          min={1}
          max={100000}
          value={builderAmount || ""}
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value));
            if (Number.isFinite(n) && n >= 0) {
              setBuilderAmount(n);
            }
          }}
          className="mt-1 w-full rounded-lg border border-jp-border bg-jp-card px-3 py-2.5 text-sm text-zinc-100 placeholder-jp-muted"
          placeholder="Enter amount"
        />
        <span className="mt-1 block text-[10px] text-jp-muted">
          Available: {balanceCredits.toLocaleString()} credits
        </span>
      </label>

      {/* Potential reward */}
      {potentialReward > 0 && (
        <div className="rounded-lg border border-jp-border bg-jp-card p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-jp-muted">Potential reward</span>
            <span className="font-medium text-jp-accent">{potentialReward.toLocaleString()} credits</span>
          </div>
          <p className="mt-1 text-[10px] text-jp-muted">
            Estimate only. Settlement is authoritative. Not a guarantee.
          </p>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={
          "rounded-lg px-3 py-2.5 text-xs " +
          (feedback.type === "success"
            ? "bg-emerald-950/40 text-emerald-400"
            : "bg-rose-950/40 text-rose-400")
        }>
          {feedback.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="w-full rounded-lg bg-jp-accent py-3.5 text-sm font-bold text-black disabled:opacity-30"
      >
        {submitting ? "Submitting…" : "Submit Entry"}
      </button>

      {!canSubmit && builderPicks.length > 0 && (
        <p className="text-center text-[10px] text-jp-muted">
          {builderAmount > balanceCredits
            ? "Insufficient virtual credits."
            : builderAmount < 1
            ? "Set an entry amount."
            : ""}
        </p>
      )}

      {isDemoMode && (
        <p className="text-center text-[10px] text-jp-muted">
          Demo mode — entries are stored locally in your browser.
        </p>
      )}
    </div>
  );
}
