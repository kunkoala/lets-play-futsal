import { describe, expect, it } from "vitest";
import { summariseSession, type RecapSession } from "./sessionRecap";

const alice = { id: 1, name: "Alice" };
const bob = { id: 2, name: "Bob" };
const cara = { id: 3, name: "Cara" };
const dan = { id: 4, name: "Dan" };

/** Two teams of two, the smallest shape that still exercises clean sheets. */
const LINEUP = [
  { teamId: 10, player: alice },
  { teamId: 10, player: bob },
  { teamId: 20, player: cara },
  { teamId: 20, player: dan },
];

function session(
  matches: readonly Omit<RecapSession["matches"][number], "lineup">[],
): RecapSession {
  return { matches: matches.map((m) => ({ ...m, lineup: LINEUP })) };
}

function goal(teamId: number, scorer: typeof alice | null, assist: typeof alice | null = null) {
  return { teamId, scorer, assist };
}

describe("summariseSession", () => {
  it("summarises an ordinary night", () => {
    const recap = summariseSession(
      session([
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          goalEvents: [goal(10, bob, alice), goal(10, bob), goal(20, dan)],
        },
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          goalEvents: [goal(20, dan, cara)],
        },
      ]),
    );

    expect(recap.matchesPlayed).toBe(2);
    expect(recap.totalGoals).toBe(4);
    expect(recap.topScorer).toEqual({ names: ["Bob", "Dan"], value: 2 });
    expect(recap.topAssister).toEqual({ names: ["Alice", "Cara"], value: 1 });
    expect(recap.biggestWin).toEqual({ margin: 1, home: 2, away: 1 });
  });

  it("shares a tied lead across every name rather than picking one", () => {
    const recap = summariseSession(
      session([
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          goalEvents: [goal(10, alice), goal(20, cara)],
        },
      ]),
    );
    expect(recap.topScorer).toEqual({ names: ["Alice", "Cara"], value: 1 });
  });

  it("gives a clean sheet to the whole team, not just the keeper", () => {
    const recap = summariseSession(
      session([
        { status: "finished", homeTeamId: 10, awayTeamId: 20, goalEvents: [goal(10, bob)] },
      ]),
    );
    expect(recap.mostCleanSheets).toEqual({ names: ["Alice", "Bob"], value: 1 });
  });

  it("counts an own goal on the scoreboard but credits it to nobody", () => {
    // Own goals are recorded against the team that benefits (see the live
    // console), so this is team 10 going 1-0 up with no scorer to thank.
    const recap = summariseSession(
      session([
        { status: "finished", homeTeamId: 10, awayTeamId: 20, goalEvents: [goal(10, null)] },
      ]),
    );
    expect(recap.totalGoals).toBe(1);
    expect(recap.topScorer).toBeNull();
    // Team 10 conceded nothing, so the clean sheet is still theirs.
    expect(recap.mostCleanSheets).toEqual({ names: ["Alice", "Bob"], value: 1 });
  });

  it("ignores a match that is still in progress", () => {
    const recap = summariseSession(
      session([
        { status: "in_progress", homeTeamId: 10, awayTeamId: 20, goalEvents: [goal(10, bob)] },
      ]),
    );
    expect(recap.matchesPlayed).toBe(0);
    expect(recap.totalGoals).toBe(0);
    expect(recap.topScorer).toBeNull();
  });

  it("reports no biggest win when every match was drawn", () => {
    const recap = summariseSession(
      session([
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          goalEvents: [goal(10, bob), goal(20, dan)],
        },
      ]),
    );
    expect(recap.biggestWin).toBeNull();
  });

  it("returns empty leaders for a session with no matches at all", () => {
    const recap = summariseSession(session([]));
    expect(recap).toMatchObject({
      matchesPlayed: 0,
      totalGoals: 0,
      topScorer: null,
      topAssister: null,
      mostCleanSheets: null,
      biggestWin: null,
      scorerPodium: [],
      assistPodium: [],
      players: [],
    });
  });
});

describe("summariseSession · podium", () => {
  it("ranks the top three values, best first", () => {
    const recap = summariseSession(
      session([
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          goalEvents: [
            goal(10, alice),
            goal(10, alice),
            goal(10, alice),
            goal(10, bob),
            goal(10, bob),
            goal(20, cara),
          ],
        },
      ]),
    );
    expect(recap.scorerPodium).toEqual([
      { place: 1, names: ["Alice"], value: 3 },
      { place: 2, names: ["Bob"], value: 2 },
      { place: 3, names: ["Cara"], value: 1 },
    ]);
  });

  it("puts everyone tied at a value on the same place", () => {
    const recap = summariseSession(
      session([
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          goalEvents: [goal(10, alice), goal(10, alice), goal(20, cara), goal(20, cara), goal(20, dan)],
        },
      ]),
    );
    // Alice and Cara share first on 2; Dan is second, not third.
    expect(recap.scorerPodium).toEqual([
      { place: 1, names: ["Alice", "Cara"], value: 2 },
      { place: 2, names: ["Dan"], value: 1 },
    ]);
  });

  it("leaves out anyone on zero rather than padding the podium", () => {
    const recap = summariseSession(
      session([
        { status: "finished", homeTeamId: 10, awayTeamId: 20, goalEvents: [goal(10, alice)] },
      ]),
    );
    expect(recap.scorerPodium).toEqual([{ place: 1, names: ["Alice"], value: 1 }]);
    expect(recap.assistPodium).toEqual([]);
  });
});

describe("summariseSession · player table", () => {
  it("gives every player who took the pitch a row, contributions first", () => {
    const recap = summariseSession(
      session([
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          goalEvents: [goal(10, bob, alice), goal(10, bob)],
        },
      ]),
    );

    expect(recap.players.map((p) => p.name)).toEqual(["Bob", "Alice", "Cara", "Dan"]);
    expect(recap.players[0]).toMatchObject({
      name: "Bob",
      goals: 2,
      assists: 0,
      contributions: 2,
      matchesPlayed: 1,
      wins: 1,
      cleanSheets: 1,
    });
    expect(recap.players[1]).toMatchObject({ name: "Alice", goals: 0, assists: 1, wins: 1 });
    expect(recap.players[3]).toMatchObject({ name: "Dan", losses: 1, cleanSheets: 0 });
  });

  it("breaks a contributions tie in favour of the scorer", () => {
    const recap = summariseSession(
      session([
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          // Bob scores once; Alice assists it. Both on one contribution.
          goalEvents: [goal(10, bob, alice)],
        },
      ]),
    );
    expect(recap.players.slice(0, 2).map((p) => p.name)).toEqual(["Bob", "Alice"]);
  });

  it("counts a draw as neither a win nor a loss", () => {
    const recap = summariseSession(
      session([
        {
          status: "finished",
          homeTeamId: 10,
          awayTeamId: 20,
          goalEvents: [goal(10, bob), goal(20, dan)],
        },
      ]),
    );
    for (const player of recap.players) {
      expect(player).toMatchObject({ wins: 0, losses: 0, draws: 1 });
    }
  });
});
