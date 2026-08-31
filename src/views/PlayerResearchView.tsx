/**
 * JU PICKS — Player research view with JU AI EDGE
 * Shows game log, stats, trends, and AI-generated insights.
 */

import { useState, useEffect } from "react";
import { getSportsProvider } from "~/lib/sports/provider-registry";
import { analyzePlayer, type AIInsight } from "~/lib/ai/edge-analysis";
import type { Player, PlayerStat, PlayerProp, Team } from "~/lib/sports/types";

interface Props {
  playerId: string;
  onClose: () => void;
}

export default function PlayerResearchView({ playerId, onClose }: Props) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [props, setProps] = useState<PlayerProp[]>([]);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const provider = getSportsProvider();
    setLoading(true);

    Promise.all([
      provider.getPlayers({}),
      provider.getPlayerStats({ playerId }),
      provider.getPlayerProps({ playerId }),
    ]).then(([playersResult, statsResult, propsResult]) => {
      const p = playersResult.data.find((pl) => pl.id === playerId);
      setPlayer(p ?? null);
      if (p?.teamId) {
        provider.getTeams({}).then((teamsResult) => {
          const t = teamsResult.data.find((tm) => tm.id === p.teamId);
          setTeam(t ?? null);
        });
      }
      setStats(statsResult.data);
      const openProps = propsResult.data.filter((pr) => pr.status === "open");
      setProps(openProps);
      // Auto-select first stat type from stats
      const statTypes = [...new Set(statsResult.data.map((s) => s.statType))];
      if (statTypes.length > 0) setSelectedStat(statTypes[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [playerId]);

  // Get the line for the selected stat type
  const currentProp = props.find((p) => p.statType === selectedStat);
  const line = currentProp?.line ?? null;

  // Generate AI insights
  const research = player && selectedStat
    ? analyzePlayer(player.name, stats, selectedStat, line)
    : null;

  function insightColor(cat: AIInsight["category"]): string {
    switch (cat) {
      case "statistic": return "text-blue-400";
      case "observation": return "text-amber-400";
      case "interpretation": return "text-emerald-400";
    }
  }

  function insightLabel(cat: AIInsight["category"]): string {
    switch (cat) {
      case "statistic": return "STAT";
      case "observation": return "OBS";
      case "interpretation": return "AI";
    }
  }

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-jp-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-jp-border bg-jp-bg/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-jp-card px-3 py-1.5 text-sm text-jp-muted"
        >
          ← Back
        </button>
        <h2 className="flex-1 text-sm font-medium">
          {player?.name ?? "Player Research"}
        </h2>
      </div>

      <div className="px-4 py-4 pb-20">
        {loading ? (
          <div className="py-8 text-center text-sm text-jp-muted">Loading research…</div>
        ) : !player ? (
          <div className="py-8 text-center text-sm text-jp-muted">Player not found.</div>
        ) : (
          <div className="space-y-4">
            {/* Player card */}
            <div className="rounded-xl border border-jp-border bg-jp-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-zinc-100">{player.name}</div>
                  <div className="text-xs text-jp-muted">
                    {player.position && <span>{player.position} · </span>}
                    {team ? `${team.city} ${team.name}` : "Free Agent"}
                  </div>
                </div>
                <div className="rounded-full bg-jp-bg px-2 py-1 text-[10px] text-jp-muted">
                  {player.status ?? "active"}
                </div>
              </div>
            </div>

            {/* Stat type selector */}
            {stats.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-jp-muted">Stat Category</h3>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(stats.map((s) => s.statType))].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStat(st)}
                      className={"whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium " +
                        (selectedStat === st
                          ? "bg-jp-accent text-black"
                          : "bg-jp-card text-jp-muted")}
                    >
                      {st.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Game log */}
            {research && research.gameLog.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-jp-muted">Recent Game Log</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {research.gameLog.map((g, i) => {
                    const overLine = line != null && g.value > line;
                    return (
                      <div
                        key={i}
                        className={"min-w-16 rounded-lg border px-3 py-2 text-center " +
                          (overLine != null && line != null
                            ? overLine
                              ? "border-emerald-600/30 bg-emerald-950/20"
                              : "border-rose-600/30 bg-rose-950/20"
                            : "border-jp-border bg-jp-card")}
                      >
                        <div className="text-sm font-bold text-zinc-100">{g.value.toFixed(1)}</div>
                        <div className="text-[10px] text-jp-muted">
                          {new Date(g.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {line != null && (
                  <p className="mt-1 text-[10px] text-jp-muted">
                    Green = over line {line} · Red = under line {line}
                  </p>
                )}
              </div>
            )}

            {/* Current prop */}
            {currentProp && (
              <div className="rounded-lg border border-jp-accent/30 bg-jp-accent/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-jp-muted">Available prop</span>
                  <span className="text-sm font-bold text-jp-accent">
                    {currentProp.statType.replace(/_/g, " ")} {currentProp.line}
                  </span>
                </div>
              </div>
            )}

            {/* JU AI EDGE insights */}
            {research && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-jp-muted">
                  <span className="rounded bg-jp-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-jp-accent">
                    JU AI EDGE
                  </span>
                  Research Insights
                </h3>
                <div className="space-y-2">
                  {research.insights.map((insight, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-jp-border bg-jp-card p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className={
                          "rounded px-1.5 py-0.5 text-[10px] font-bold " +
                          insightColor(insight.category).replace("text-", "bg-").replace("-400", "/20 ") +
                          " " + insightColor(insight.category)
                        }>
                          {insightLabel(insight.category)}
                        </span>
                        <span className="text-xs font-medium text-zinc-100">{insight.label}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-jp-muted">{insight.text}</p>
                    </div>
                  ))}
                  {research.lineComparison && (
                    <div className="rounded-lg border border-jp-accent/20 bg-jp-accent/5 p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-jp-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-jp-accent">
                          OBS
                        </span>
                        <span className="text-xs font-medium text-zinc-100">
                          {research.lineComparison.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-jp-muted">{research.lineComparison.text}</p>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-jp-muted">
                  {research.disclaimer}
                </p>
              </div>
            )}

            {/* No data */}
            {stats.length === 0 && (
              <div className="rounded-xl border border-jp-border bg-jp-card p-6 text-center">
                <p className="text-sm text-jp-muted">
                  No recent stats available for this player.
                </p>
                <p className="mt-1 text-xs text-jp-muted">
                  JU AI EDGE requires sourced statistics to provide analysis.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
