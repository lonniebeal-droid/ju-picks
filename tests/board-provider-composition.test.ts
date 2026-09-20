/**
 * Pure composition checks for the data the Batch 4 board layer consumes.
 * No auth, no DB — exercises StaticDemoProvider only.
 */
import { describe, it, expect } from "vitest";
import { StaticDemoProvider } from "~/lib/sports/providers/static-demo";

describe("board provider composition (StaticDemoProvider)", () => {
  const provider = new StaticDemoProvider();

  it("exposes synthetic demo sports", async () => {
    const { data, meta } = await provider.getSports();
    expect(provider.isSynthetic).toBe(true);
    expect(provider.id).toBe("static-demo");
    expect(meta.isSynthetic).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(3);
    const codes = data.map((s) => s.code);
    expect(codes).toEqual(expect.arrayContaining(["NFL", "NBA", "MLB"]));
  });

  it("returns scheduled games with open props", async () => {
    const games = await provider.getGames({ status: "scheduled" });
    expect(games.data.length).toBeGreaterThan(0);
    for (const g of games.data) {
      expect(g.status).toBe("scheduled");
      expect(g.homeTeamId).toBeTruthy();
      expect(g.awayTeamId).toBeTruthy();
    }

    const props = await provider.getPlayerProps();
    const open = props.data.filter((p) => p.status === "open");
    expect(open.length).toBeGreaterThan(0);

    const gameIds = new Set(games.data.map((g) => g.id));
    const openOnScheduled = open.filter((p) => gameIds.has(p.gameId));
    expect(openOnScheduled.length).toBeGreaterThan(0);
  });

  it("resolves teams and players for board rows", async () => {
    const [teams, players] = await Promise.all([
      provider.getTeams(),
      provider.getPlayers(),
    ]);
    expect(teams.data.length).toBeGreaterThan(0);
    expect(players.data.length).toBeGreaterThan(0);

    const teamIds = new Set(teams.data.map((t) => t.id));
    for (const p of players.data) {
      if (p.teamId) {
        expect(teamIds.has(p.teamId)).toBe(true);
      }
    }
  });

  it("provides player stats for research board", async () => {
    const players = await provider.getPlayers();
    const sample = players.data[0];
    expect(sample).toBeDefined();
    expect(typeof sample.id).toBe("string");
    const stats = await provider.getPlayerStats({ playerId: sample.id });
    for (const s of stats.data) {
      expect(s.playerId).toBeTruthy();
      expect(typeof s.value).toBe("number");
      expect(s.statType).toBeTruthy();
    }
  });

  it("filters props by gameId for event board", async () => {
    const games = await provider.getGames({ status: "scheduled" });
    const gameId = games.data[0]?.id;
    expect(gameId).toBeTruthy();
    const props = await provider.getPlayerProps({ gameId: gameId as string });
    expect(props.data.every((p) => p.gameId === gameId)).toBe(true);
    expect(props.data.length).toBeGreaterThan(0);
  });
});
