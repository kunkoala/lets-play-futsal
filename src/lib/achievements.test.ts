import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  achievementScore,
  deriveExtraSignals,
  emptyExtraSignals,
  evaluateAchievements,
  TIER_POINTS,
  type AchievementInput,
  type AchievementSession,
} from "./achievements";
import { emptyTotals, withRates } from "./stats";

const PLAYER = 1;
const OPPONENT = 2;

/** One goal event, defaulting to a goal (no assist) for PLAYER's team unless overridden. */
function goal(overrides: Partial<AchievementSession["matches"][number]["goalEvents"][number]> = {}) {
  return { teamId: 10, scorerId: PLAYER, assistId: null, matchSec: null, ...overrides };
}

/** PLAYER lines up for team 10, OPPONENT for team 20, unless overridden. */
function match(overrides: Partial<AchievementSession["matches"][number]> = {}) {
  return {
    homeTeamId: 10,
    awayTeamId: 20,
    status: "finished",
    durationSec: null,
    lineup: [
      { playerId: PLAYER, teamId: 10 },
      { playerId: OPPONENT, teamId: 20 },
    ],
    goalEvents: [],
    ...overrides,
  };
}

function session(overrides: Partial<AchievementSession> = {}): AchievementSession {
  return {
    seasonId: 1,
    teams: [
      { id: 10, players: [{ playerId: PLAYER }] },
      { id: 20, players: [{ playerId: OPPONENT }] },
    ],
    matches: [],
    ...overrides,
  };
}

describe("deriveExtraSignals", () => {
  it("returns all-zero signals for a player who appears in no session", () => {
    expect(deriveExtraSignals([], PLAYER)).toEqual(emptyExtraSignals());
  });

  it("skips sessions the player isn't rostered in", () => {
    const s = session({ teams: [{ id: 10, players: [{ playerId: OPPONENT }] }] });
    expect(deriveExtraSignals([s], PLAYER)).toEqual(emptyExtraSignals());
  });

  it("counts a match with 3+ assists as an assist hat-trick", () => {
    const s = session({
      matches: [
        match({
          goalEvents: [
            goal({ scorerId: OPPONENT, assistId: PLAYER }),
            goal({ scorerId: OPPONENT, assistId: PLAYER }),
            goal({ scorerId: OPPONENT, assistId: PLAYER }),
          ],
        }),
      ],
    });
    expect(deriveExtraSignals([s], PLAYER).assistHatTricks).toBe(1);
  });

  it("counts a match with 4+ combined goals+assists as a Messi match", () => {
    const s = session({
      matches: [
        match({
          goalEvents: [
            goal(), // goal 1
            goal(), // goal 2
            goal({ scorerId: OPPONENT, assistId: PLAYER }), // assist 1
            goal({ scorerId: OPPONENT, assistId: PLAYER }), // assist 2
          ],
        }),
      ],
    });
    expect(deriveExtraSignals([s], PLAYER).messiMatches).toBe(1);
  });

  it("only counts a goal as last-minute when both matchSec and durationSec are known", () => {
    const durationSec = 600; // 10 min
    const s = session({
      matches: [
        match({ durationSec, goalEvents: [goal({ matchSec: 570 })] }), // 30s from full time
        match({ durationSec: null, goalEvents: [goal({ matchSec: 599 })] }), // no duration set
        match({ durationSec, goalEvents: [goal({ matchSec: 100 })] }), // early goal
      ],
    });
    expect(deriveExtraSignals([s], PLAYER).lastMinuteGoals).toBe(1);
  });

  it("tracks the longest win streak across matches and sessions, resetting on a non-win", () => {
    const win = match({ goalEvents: [goal()] });
    const loss = match({ goalEvents: [goal({ scorerId: OPPONENT, teamId: 20 })] });
    const s1 = session({ matches: [win, win, loss] });
    const s2 = session({ matches: [win, win, win] });
    expect(deriveExtraSignals([s1, s2], PLAYER).maxWinStreak).toBe(3);
  });

  it("records whether the very first finished match was a win", () => {
    const loss = match({ goalEvents: [goal({ scorerId: OPPONENT, teamId: 20 })] });
    const win = match({ goalEvents: [goal()] });
    expect(deriveExtraSignals([session({ matches: [loss, win] })], PLAYER).firstMatchWin).toBe(
      false,
    );
    expect(deriveExtraSignals([session({ matches: [win, loss] })], PLAYER).firstMatchWin).toBe(
      true,
    );
  });

  it("tracks the most hat-trick matches within a single session", () => {
    const hatTrick = match({ goalEvents: [goal(), goal(), goal()] });
    const brace = match({ goalEvents: [goal(), goal()] });
    const s = session({ matches: [hatTrick, hatTrick, brace] });
    expect(deriveExtraSignals([s], PLAYER).hatTrickSessionsMax).toBe(2);
  });

  it("tracks the most goals scored across one session's matches", () => {
    const twoGoals = match({ goalEvents: [goal(), goal()] });
    const oneGoal = match({ goalEvents: [goal()] });
    const s = session({ matches: [twoGoals, oneGoal] });
    expect(deriveExtraSignals([s], PLAYER).sessionGoalsMax).toBe(3);
  });

  it("counts a session as a perfect matchday only with 2+ matches, all won", () => {
    const win = match({ goalEvents: [goal()] });
    const loss = match({ goalEvents: [goal({ scorerId: OPPONENT, teamId: 20 })] });
    const oneWinOnly = session({ matches: [win] }); // only 1 match — doesn't count
    const sweep = session({ matches: [win, win] });
    const mixed = session({ matches: [win, loss] });
    expect(deriveExtraSignals([oneWinOnly], PLAYER).perfectMatchdays).toBe(0);
    expect(deriveExtraSignals([sweep], PLAYER).perfectMatchdays).toBe(1);
    expect(deriveExtraSignals([mixed], PLAYER).perfectMatchdays).toBe(0);
  });

  it("tracks the most matchdays attended within a single season", () => {
    const s = (seasonId: number) => session({ seasonId, matches: [match({ goalEvents: [goal()] })] });
    const signals = deriveExtraSignals([s(1), s(1), s(2)], PLAYER);
    expect(signals.maxSessionsInSeason).toBe(2);
  });
});

/** A minimal AchievementInput — everything at 0/false unless overridden. */
function input(overrides: Partial<AchievementInput> = {}): AchievementInput {
  return {
    ...withRates(emptyTotals()),
    ...emptyExtraSignals(),
    rating: 0,
    ...overrides,
  };
}

describe("ACHIEVEMENTS catalog", () => {
  it("has a unique id for every achievement", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every achievement points matching its tier", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.points).toBe(TIER_POINTS[a.tier]);
    }
  });

  it("gives every achievement a glyph", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.glyph.length).toBeGreaterThan(0);
    }
  });
});

describe("evaluateAchievements", () => {
  it("unlocks nothing for a totally blank player", () => {
    const evaluated = evaluateAchievements(input());
    expect(evaluated.every((a) => !a.unlocked)).toBe(true);
  });

  it("unlocks exactly the achievements a given input satisfies", () => {
    const evaluated = evaluateAchievements(input({ mvps: 1 }));
    const unlockedIds = evaluated.filter((a) => a.unlocked).map((a) => a.id);
    expect(unlockedIds).toEqual(["man_of_the_match"]);
  });

  it("Rising Star and Elite read straight off the passed-in rating", () => {
    const low = evaluateAchievements(input({ rating: 50 }));
    const risingStar = evaluateAchievements(input({ rating: 70 }));
    const elite = evaluateAchievements(input({ rating: 85 }));
    expect(low.find((a) => a.id === "rising_star")!.unlocked).toBe(false);
    expect(risingStar.find((a) => a.id === "rising_star")!.unlocked).toBe(true);
    expect(elite.find((a) => a.id === "elite")!.unlocked).toBe(true);
  });
});

describe("achievementScore", () => {
  it("is 0 when nothing is unlocked", () => {
    expect(achievementScore(evaluateAchievements(input()))).toBe(0);
  });

  it("sums only the unlocked achievements' points", () => {
    // mvps: 5 clears three thresholds at once —
    // man_of_the_match (bronze, 10) + talk_of_the_season (silver, 25) + crowd_favorite (gold, 50)
    const evaluated = evaluateAchievements(input({ mvps: 5 }));
    expect(achievementScore(evaluated)).toBe(10 + 25 + 50);
  });
});
