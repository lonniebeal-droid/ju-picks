/**
 * JU PICKS — JU AI EDGE: local sports research analysis
 *
 * Clearly distinguishes:
 * - Sourced statistics (from provider data)
 * - Calculated observations (computed from stats)
 * - AI interpretation (rule-based insights, NOT predictions)
 *
 * No hallucination. No outcome guarantees. Uses only provided data.
 * If data is unavailable, says so.
 */

import type { PlayerStat } from "../sports/types";

export interface AIInsight {
  category: "statistic" | "observation" | "interpretation";
  label: string;
  text: string;
}

export interface PlayerResearchResult {
  playerName: string;
  statType: string;
  gameLog: Array<{ gameId: string; value: number; date: string }>;
  insights: AIInsight[];
  lineComparison: AIInsight | null;
  disclaimer: string;
}

/**
 * Analyze a player's recent stats and generate research insights.
 * @param playerName - Display name
 * @param stats - Recent game stats for this player
 * @param statType - The stat category to analyze
 * @param line - Optional prop line to compare against
 */
export function analyzePlayer(
  playerName: string,
  stats: PlayerStat[],
  statType: string,
  line?: number | null,
): PlayerResearchResult {
  const relevant = stats
    .filter((s) => s.statType === statType)
    .sort((a, b) => new Date(b.sourceUpdatedAt).getTime() - new Date(a.sourceUpdatedAt).getTime());

  const insights: AIInsight[] = [];

  if (relevant.length === 0) {
    return {
      playerName,
      statType: formatStatType(statType),
      gameLog: [],
      insights: [
        {
          category: "interpretation",
          label: "Data Unavailable",
          text: `No recent ${formatStatType(statType)} data available for ${playerName}. JU AI EDGE cannot provide analysis without sourced statistics.`,
        },
      ],
      lineComparison: null,
      disclaimer: "JU AI EDGE uses only sourced statistics. No guarantees. Not financial advice.",
    };
  }

  const values = relevant.map((s) => s.value);
  const gameLog = relevant.map((s) => ({
    gameId: s.gameId,
    value: s.value,
    date: s.sourceUpdatedAt,
  }));

  // ─── Sourced statistics ──────────────────────────────
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const last5 = values.slice(0, Math.min(5, values.length));
  const last5Avg = last5.reduce((a, b) => a + b, 0) / last5.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const recent = values[0];
  const prevAvg = values.length > 5
    ? values.slice(5).reduce((a, b) => a + b, 0) / (values.length - 5)
    : avg;

  insights.push({
    category: "statistic",
    label: "Recent Average",
    text: `${playerName} has averaged ${avg.toFixed(1)} ${formatStatType(statType)} over ${values.length} recent game${values.length > 1 ? "s" : ""}.`,
  });

  insights.push({
    category: "statistic",
    label: "Last 5 Games",
    text: `In the last 5 games: ${last5.map((v) => v.toFixed(0)).join(", ")} (avg ${last5Avg.toFixed(1)}).`,
  });

  insights.push({
    category: "statistic",
    label: "Range",
    text: `Range: ${min.toFixed(1)} to ${max.toFixed(1)} ${formatStatType(statType)}.`,
  });

  // ─── Calculated observations ─────────────────────────
  const trend = last5Avg > prevAvg * 1.1
    ? "trending upward"
    : last5Avg < prevAvg * 0.9
    ? "trending downward"
    : "relatively stable";

  insights.push({
    category: "observation",
    label: "Trend",
    text: `Recent form is ${trend} compared to earlier games (${last5Avg.toFixed(1)} vs ${prevAvg.toFixed(1)} average).`,
  });

  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const consistency = stdDev < avg * 0.15 ? "highly consistent" : stdDev < avg * 0.3 ? "moderately consistent" : "highly variable";

  insights.push({
    category: "observation",
    label: "Consistency",
    text: `Performance is ${consistency} (std dev: ${stdDev.toFixed(1)}, ${(stdDev / avg * 100).toFixed(0)}% of average).`,
  });

  // ─── AI interpretation (rule-based, not prediction) ───
  if (recent > avg * 1.2) {
    insights.push({
      category: "interpretation",
      label: "Recent Surge",
      text: `${playerName}'s most recent game (${recent.toFixed(1)}) was significantly above their average. This could indicate improved form, a favorable matchup, or an outlier performance.`,
    });
  } else if (recent < avg * 0.8) {
    insights.push({
      category: "interpretation",
      label: "Recent Dip",
      text: `${playerName}'s most recent game (${recent.toFixed(1)}) was below their average. This could reflect a tough opponent, game script, or normal variance.`,
    });
  }

  // ─── Line comparison ─────────────────────────────────
  let lineComparison: AIInsight | null = null;
  if (line != null && Number.isFinite(line)) {
    const gamesOver = values.filter((v) => v > line).length;
    const gamesUnder = values.filter((v) => v < line).length;
    const gamesPush = values.filter((v) => v === line).length;
    const overPct = ((gamesOver / values.length) * 100).toFixed(0);

    lineComparison = {
      category: "observation",
      label: "Line Comparison",
      text: `Against a line of ${line}: ${gamesOver} over, ${gamesUnder} under, ${gamesPush} push in ${values.length} games (${overPct}% over rate). Recent average (${last5Avg.toFixed(1)}) is ${last5Avg > line ? "above" : last5Avg < line ? "below" : "at"} the line.`,
    };
  }

  return {
    playerName,
    statType: formatStatType(statType),
    gameLog,
    insights,
    lineComparison,
    disclaimer: "JU AI EDGE uses only sourced statistics. No guarantees. Not financial advice. Virtual credits only.",
  };
}

function formatStatType(statType: string): string {
  return statType.replace(/_/g, " ");
}

/**
 * Compare two players for a given stat.
 */
export function comparePlayers(
  playerA: string,
  statsA: PlayerStat[],
  playerB: string,
  statsB: PlayerStat[],
  statType: string,
): AIInsight[] {
  const insights: AIInsight[] = [];
  const aValues = statsA.filter((s) => s.statType === statType).map((s) => s.value);
  const bValues = statsB.filter((s) => s.statType === statType).map((s) => s.value);

  if (aValues.length === 0 || bValues.length === 0) {
    insights.push({
      category: "interpretation",
      label: "Comparison Unavailable",
      text: "Insufficient data to compare these players.",
    });
    return insights;
  }

  const aAvg = aValues.reduce((a, b) => a + b, 0) / aValues.length;
  const bAvg = bValues.reduce((a, b) => a + b, 0) / bValues.length;
  const diff = aAvg - bAvg;

  insights.push({
    category: "statistic",
    label: "Average Comparison",
    text: `${playerA}: ${aAvg.toFixed(1)} avg vs ${playerB}: ${bAvg.toFixed(1)} avg (${diff > 0 ? "+" : ""}${diff.toFixed(1)} difference).`,
  });

  insights.push({
    category: "observation",
    label: "Form Comparison",
    text: `${playerA} has ${aValues.length} games of data, ${playerB} has ${bValues.length} games. ${
      aAvg > bAvg ? playerA : playerB
    } has the higher recent average in ${formatStatType(statType)}.`,
  });

  return insights;
}
