import { describe, expect, it } from "vitest";
import { summariseSession, type RecapSession } from "./sessionRecap";

const alice = { id: 1, name: "Alice" };
const bob = { id: 2, name: "Bob" };
const cara = { id: 3, name: "Cara" };
const dan = { id: 4, name: "Dan" };

/** Two teams of two, the smallest shape that still exercises clean sheets. */
function session(matches: RecapSession["matches"]): RecapSession {
  return {
    teams: [
      {
        id: 10,
        players: [
          { isKeeper: true, player: alice },
          { isKeeper: false, player: bob },
        ],
      },
      {
        id: 20,
        players: [
          { isKeeper: true, player: cara },
          { isKeeper: false, player: dan },
        ],
      },
    ],
    matches,
  };
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
    });
  });
});
