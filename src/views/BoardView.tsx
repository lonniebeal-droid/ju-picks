/**
 * JU PICKS — Board view: sport → game → props → Higher/Lower
 */

import { useState, useEffect } from "react";
import { useApp } from "~/lib/app/app-provider";
import { getSportsProvider } from "~/lib/sports/provider-registry";
import type { Sport, Game, PlayerProp, Player, Team } from "~/lib/sports/types";

interface BoardViewProps {
  onResearch?: (playerId: string) => void;
}

export default function BoardView({ onResearch }: BoardViewProps = {}) {
  const { addBuilderPick, builderPicks } = useApp();
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [props, setProps] = useState<PlayerProp[]>([]);
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [teams, setTeams] = useState<Map<string, Team>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sports on mount
  useEffect(() => {
    const provider = getSportsProvider();
    provider.getSports()
      .then((result) => {
        setSports(result.data);
        if (result.data.length > 0) {
          setSelectedSport(result.data[0].code);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load sports");
        setLoading(false);
      });
  }, []);

  // Fetch games + players + teams when sport changes
  useEffect(() => {
    if (!selectedSport) return;
    const provider = getSportsProvider();
    setLoading(true);

    provider.getLeagues(selectedSport).then(async (leagueResult) => {
      const leagueId = leagueResult.data[0]?.id;
      if (!leagueId) {
        setGames([]);
        setLoading(false);
        return;
      }

      const [gamesResult, playersResult, teamsResult] = await Promise.all([
        provider.getGames({ leagueId }),
        provider.getPlayers({ leagueId }),
        provider.getTeams({ leagueId }),
      ]);

      setGames(gamesResult.data);
      const pm = new Map<string, Player>();
      playersResult.data.forEach((p) => pm.set(p.id, p));
      setPlayers(pm);
      const tm = new Map<string, Team>();
      teamsResult.data.forEach((t) => tm.set(t.id, t));
      setTeams(tm);

      // Auto-select first upcoming game
      const upcoming = gamesResult.data.filter((g) => g.status === "scheduled");
      if (upcoming.length > 0) {
        setSelectedGame(upcoming[0].id);
      } else if (gamesResult.data.length > 0) {
        setSelectedGame(gamesResult.data[0].id);
      } else {
        setSelectedGame(null);
      }
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load games");
      setLoading(false);
    });
  }, [selectedSport]);

  // Fetch props when game changes
  useEffect(() => {
    if (!selectedGame) {
      setProps([]);
      return;
    }
    const provider = getSportsProvider();
    provider.getPlayerProps({ gameId: selectedGame })
      .then((result) => setProps(result.data.filter((p) => p.status === "open")))
      .catch(() => setProps([]));
  }, [selectedGame]);

  function formatGameTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function getTeamAbbr(teamId: string): string {
    return teams.get(teamId)?.abbreviation ?? "???";
  }

  function getPlayerName(playerId: string): string {
    return players.get(playerId)?.name ?? "Unknown Player";
  }

  function getPlayerPosition(playerId: string): string {
    return players.get(playerId)?.position ?? "";
  }

  function isPicked(projectionId: string): boolean {
    return builderPicks.some((p) => p.projectionId === projectionId);
  }

  function handlePick(prop: PlayerProp, direction: "HIGHER" | "LOWER") {
    addBuilderPick({
      projectionId: prop.id,
      direction,
      playerName: getPlayerName(prop.playerId),
      statType: prop.statType.replace(/_/g, " "),
      line: prop.line,
    });
  }

  if (loading && sports.length === 0) {
    return <div className="py-8 text-center text-sm text-jp-muted">Loading sports data…</div>;
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-rose-400">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-jp-card px-4 py-2 text-xs text-jp-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sport selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sports.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => setSelectedSport(s.code)}
            className={"whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium " +
              (selectedSport === s.code
                ? "bg-jp-accent text-black"
                : "bg-jp-card text-jp-muted")}
          >
            {s.code}
          </button>
        ))}
      </div>

      {/* Game selector */}
      {games.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {games.map((g) => {
            const homeAbbr = getTeamAbbr(g.homeTeamId);
            const awayAbbr = getTeamAbbr(g.awayTeamId);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGame(g.id)}
                className={"whitespace-nowrap rounded-lg border px-3 py-2 text-xs " +
                  (selectedGame === g.id
                    ? "border-jp-accent bg-jp-accent/10 text-jp-accent"
                    : "border-jp-border bg-jp-card text-jp-muted")}
              >
                <div className="font-medium">{awayAbbr} @ {homeAbbr}</div>
                <div className="text-[10px] text-jp-muted">
                  {g.status === "scheduled" ? formatGameTime(g.startsAt) : g.status}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Props list */}
      {selectedGame && props.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-jp-muted">Player Props</h2>
            <span className="text-[10px] text-jp-muted">Synthetic demo data</span>
          </div>
          {props.map((prop) => {
            const picked = isPicked(prop.id);
            const playerName = getPlayerName(prop.playerId);
            const position = getPlayerPosition(prop.playerId);
            return (
              <div
                key={prop.id}
                className={"rounded-xl border bg-jp-card p-4 " +
                  (picked ? "border-jp-accent/40" : "border-jp-border")}
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="font-medium text-zinc-100">{playerName}</div>
                    <div className="text-xs text-jp-muted">
                      {position && <span>{position} · </span>}
                      {prop.statType.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-zinc-100">{prop.line}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePick(prop, "HIGHER")}
                    disabled={picked}
                    className={"rounded-lg py-2.5 text-sm font-semibold transition-colors " +
                      (picked
                        ? "bg-jp-border text-jp-muted"
                        : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30")}
                  >
                    Higher
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePick(prop, "LOWER")}
                    disabled={picked}
                    className={"rounded-lg py-2.5 text-sm font-semibold transition-colors " +
                      (picked
                        ? "bg-jp-border text-jp-muted"
                        : "bg-rose-600/20 text-rose-400 hover:bg-rose-600/30")}
                  >
                    Lower
                  </button>
                </div>
                {picked && (
                  <p className="mt-2 text-center text-[10px] text-jp-accent">
                    Added to slip
                  </p>
                )}
                {onResearch && (
                  <button
                    type="button"
                    onClick={() => onResearch(prop.playerId)}
                    className="mt-2 w-full rounded-lg bg-jp-bg py-1.5 text-xs font-medium text-jp-accent hover:bg-jp-accent/10"
                  >
                    🔍 Research {playerName.split(" ").pop()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedGame && props.length === 0 && !loading && (
        <div className="py-8 text-center text-sm text-jp-muted">
          No open props for this game.
        </div>
      )}

      {!selectedGame && !loading && (
        <div className="py-8 text-center text-sm text-jp-muted">
          Select a game to see player props.
        </div>
      )}
    </div>
  );
}
