/**
 * JU PICKS — Mobile-first shell
 * Virtual credits only. No cash language.
 */

import { useMemo, useState } from "react";
import {
  createEmptyEntryBuilder,
  addPick,
  removePick,
  setEntryAmount,
  setEntryMode,
  estimatePotentialReward,
  validateBuilder,
} from "~/lib/entries/builder";
import type { EntryBuilderState } from "~/lib/entries/types";

type Tab = "board" | "slip" | "wallet" | "entries" | "profile";

const DEMO_PROPS = [
  {
    projectionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    playerName: "Patrick Mahomes",
    statType: "Passing Yards",
    line: 275.5,
    team: "KC",
  },
  {
    projectionId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    playerName: "Josh Allen",
    statType: "Passing Yards",
    line: 265.5,
    team: "BUF",
  },
];

export function App() {
  const [tab, setTab] = useState<Tab>("board");
  const [builder, setBuilder] = useState<EntryBuilderState>(() =>
    createEmptyEntryBuilder("cccccccc-cccc-cccc-cccc-cccccccccccc"),
  );
  const [credits] = useState(1000);

  const estimate = useMemo(
    () => estimatePotentialReward(builder, null),
    [builder],
  );

  function onHigher(p: (typeof DEMO_PROPS)[0]) {
    try {
      setBuilder((s) =>
        addPick(s, {
          projectionId: p.projectionId,
          direction: "HIGHER",
          playerName: p.playerName,
          statType: p.statType,
          line: p.line,
        }),
      );
      setTab("slip");
    } catch {
      // duplicate pick
    }
  }

  function onLower(p: (typeof DEMO_PROPS)[0]) {
    try {
      setBuilder((s) =>
        addPick(s, {
          projectionId: p.projectionId,
          direction: "LOWER",
          playerName: p.playerName,
          statType: p.statType,
          line: p.line,
        }),
      );
      setTab("slip");
    } catch {
      // duplicate
    }
  }

  const validation = validateBuilder(builder);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-jp-bg text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-jp-border bg-jp-bg/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">JU PICKS</h1>
          <div className="rounded-full bg-jp-card px-3 py-1 text-sm text-jp-accent">
            {credits.toLocaleString()} credits
          </div>
        </div>
        <p className="mt-1 text-xs text-jp-muted">
          Virtual credits only · No cash value · No withdrawals
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "board" && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-jp-muted">Player props</h2>
            <p className="text-xs text-jp-muted">
              Demo board (synthetic). Live sports data is not configured.
            </p>
            {DEMO_PROPS.map((p) => (
              <div
                key={p.projectionId}
                className="rounded-xl border border-jp-border bg-jp-card p-4"
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="font-medium">{p.playerName}</div>
                    <div className="text-xs text-jp-muted">
                      {p.team} · {p.statType}
                    </div>
                  </div>
                  <div className="text-lg font-semibold">{p.line}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onHigher(p)}
                    className="rounded-lg bg-emerald-600/20 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30"
                  >
                    Higher
                  </button>
                  <button
                    type="button"
                    onClick={() => onLower(p)}
                    className="rounded-lg bg-rose-600/20 py-2 text-sm font-medium text-rose-400 hover:bg-rose-600/30"
                  >
                    Lower
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "slip" && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-jp-muted">Entry slip</h2>
            {builder.picks.length === 0 ? (
              <p className="text-sm text-jp-muted">
                No picks yet. Add Higher/Lower from the board.
              </p>
            ) : (
              <ul className="space-y-2">
                {builder.picks.map((pk) => (
                  <li
                    key={pk.projectionId}
                    className="flex items-center justify-between rounded-lg border border-jp-border bg-jp-card px-3 py-2 text-sm"
                  >
                    <span>
                      {pk.playerName ?? pk.projectionId.slice(0, 8)} ·{" "}
                      <span className="text-jp-accent">{pk.direction}</span>
                      {pk.line != null ? ` ${pk.line}` : ""}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-jp-muted hover:text-zinc-200"
                      onClick={() =>
                        setBuilder((s) => removePick(s, pk.projectionId))
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBuilder((s) => setEntryMode(s, "FLEX"))}
                className={`flex-1 rounded-lg py-2 text-sm ${
                  builder.mode === "FLEX"
                    ? "bg-jp-accent text-black"
                    : "bg-jp-card text-jp-muted"
                }`}
              >
                Flex
              </button>
              <button
                type="button"
                onClick={() => setBuilder((s) => setEntryMode(s, "POWER"))}
                className={`flex-1 rounded-lg py-2 text-sm ${
                  builder.mode === "POWER"
                    ? "bg-jp-accent text-black"
                    : "bg-jp-card text-jp-muted"
                }`}
              >
                Power
              </button>
            </div>

            <label className="block text-sm">
              Entry amount (virtual credits)
              <input
                type="number"
                min={1}
                max={1_000_000}
                value={builder.entryAmountCredits || ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    try {
                      setBuilder((s) => setEntryAmount(s, Math.floor(n)));
                    } catch {
                      /* invalid */
                    }
                  }
                }}
                className="mt-1 w-full rounded-lg border border-jp-border bg-jp-card px-3 py-2 text-sm"
              />
            </label>

            <div className="rounded-lg border border-jp-border bg-jp-card p-3 text-xs text-jp-muted">
              {estimate.available
                ? `Potential virtual reward: ${estimate.estimatedCredits}`
                : estimate.note}
            </div>

            <button
              type="button"
              disabled={!validation.valid}
              className="w-full rounded-lg bg-jp-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
              onClick={() => {
                // Submission requires server/DB — show honest unavailable state
                alert(
                  "Entry submission requires connected database (jp_place_entry). Not configured in this environment.",
                );
              }}
            >
              Submit entry
            </button>
          </section>
        )}

        {tab === "wallet" && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-jp-muted">Wallet</h2>
            <div className="rounded-xl border border-jp-border bg-jp-card p-6 text-center">
              <div className="text-3xl font-semibold text-jp-accent">
                {credits.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-jp-muted">virtual credits</div>
              <p className="mt-3 text-xs text-jp-muted">
                No cash value. Not redeemable. No deposits or withdrawals.
              </p>
            </div>
          </section>
        )}

        {tab === "entries" && (
          <section>
            <h2 className="text-sm font-medium text-jp-muted">My entries</h2>
            <p className="mt-2 text-sm text-jp-muted">
              Entry history requires authenticated session and database.
            </p>
          </section>
        )}

        {tab === "profile" && (
          <section className="space-y-2 text-sm text-jp-muted">
            <h2 className="font-medium text-zinc-100">Profile</h2>
            <p>Sign-in requires auth provider configuration.</p>
            <p>REAL_MONEY_ENABLED=false</p>
            <p>Product: free-to-play virtual credits only.</p>
          </section>
        )}
      </main>

      <nav className="sticky bottom-0 grid grid-cols-5 border-t border-jp-border bg-jp-bg/95 px-1 py-2 text-center text-xs backdrop-blur">
        {(
          [
            ["board", "Board"],
            ["slip", "Slip"],
            ["wallet", "Wallet"],
            ["entries", "Entries"],
            ["profile", "Profile"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id ? "text-jp-accent" : "text-jp-muted hover:text-zinc-200"
            }
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
