/**
 * Xbox-style achievement badges, entirely derived — no stored "unlocked" row,
 * same philosophy as the rest of this app (see schema.prisma's modeling
 * notes): recomputing from goal events/attendance is deterministic and cheap
 * at this club's scale, so there's nothing to keep in sync.
 *
 * Evaluated for the player profile's all-time badge grid: every achievement
 * checked against a player's whole career via `evaluateAchievements`. Once
 * true, always true — nothing here can be "un-unlocked". `rating` is passed
 * in by the caller (there's no single all-time rating number — it's a
 * per-season concept — so this uses whatever season rating the caller has to
 * hand, typically the active season's).
 *
 * Not currently fed back into the rating formula itself (RISING_STAR/ELITE
 * naming a rating threshold would make that circular) — deferred for now.
 */
import type { PlayerStats } from "@/lib/stats";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export const TIER_POINTS: Record<AchievementTier, number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
  platinum: 100,
};

/**
 * Signals no existing aggregate tracks — everything else an achievement
 * needs (goals, mvps, cleanSheets, ...) already lives on `PlayerStats`.
 */
export type ExtraSignals = {
  /** Matches with 3+ assists. */
  assistHatTricks: number;
  /** Matches with 4+ combined goals and assists. */
  messiMatches: number;
  /** Goals scored in the final minute of a timed match. */
  lastMinuteGoals: number;
  /** Longest run of consecutive match wins. */
  maxWinStreak: number;
  /** Won the first finished match they ever played. */
  firstMatchWin: boolean;
  /** Most hat-trick matches within any single session. */
  hatTrickSessionsMax: number;
  /** Most goals scored across all matches within any single session. */
  sessionGoalsMax: number;
  /** Sessions where every match played (2+) was a win. */
  perfectMatchdays: number;
  /** Most matchdays attended within any single season. */
  maxSessionsInSeason: number;
};

export function emptyExtraSignals(): ExtraSignals {
  return {
    assistHatTricks: 0,
    messiMatches: 0,
    lastMinuteGoals: 0,
    maxWinStreak: 0,
    firstMatchWin: false,
    hatTrickSessionsMax: 0,
    sessionGoalsMax: 0,
    perfectMatchdays: 0,
    maxSessionsInSeason: 0,
  };
}

/** Shape `deriveExtraSignals` needs — a structural subset of the Prisma
 *  session/match/goalEvent tree, wide enough that both the real query and
 *  demoData.ts's generated season satisfy it without conversion. */
export type AchievementSession = {
  seasonId: number;
  teams: readonly { id: number; players: readonly { playerId: number }[] }[];
  matches: readonly {
    homeTeamId: number;
    awayTeamId: number;
    status: string;
    /** Who was actually on the pitch — see MatchPlayer in prisma/schema.prisma. */
    lineup: readonly { playerId: number; teamId: number }[];
    /** Planned match length; null on untimed/legacy matches — the
     *  last-minute check simply never fires for those. */
    durationSec: number | null;
    goalEvents: readonly {
      teamId: number;
      scorerId: number | null;
      assistId: number | null;
      matchSec: number | null;
    }[];
  }[];
};

/** Longer than this and a goal counts as "last-minute". */
const LAST_MINUTE_SEC = 60;

/**
 * Walks a player's sessions oldest-first (same convention as
 * `aggregateSeason`) computing the handful of signals not already covered by
 * `PlayerStats`. Session-scoped signals (hat-trick count, goal total, sweep)
 * are tracked per session and folded into a running max/count; streaks and
 * "first match" are tracked across the whole chronological walk.
 */
export function deriveExtraSignals(
  sessions: readonly AchievementSession[],
  playerId: number,
): ExtraSignals {
  const signals = emptyExtraSignals();
  let currentStreak = 0;
  let seenFirstMatch = false;
  const sessionsPerSeason = new Map<number, number>();

  for (const session of sessions) {
    const team = session.teams.find((t) => t.players.some((p) => p.playerId === playerId));
    if (!team) continue;

    const seasonCount = (sessionsPerSeason.get(session.seasonId) ?? 0) + 1;
    sessionsPerSeason.set(session.seasonId, seasonCount);
    signals.maxSessionsInSeason = Math.max(signals.maxSessionsInSeason, seasonCount);

    let sessionGoals = 0;
    let sessionHatTrickMatches = 0;
    let sessionMatchesPlayed = 0;
    let sessionWins = 0;

    for (const match of session.matches) {
      if (match.status !== "finished") continue;
      // Which side they played for comes from this match's own lineup, not the
      // team sheet — a substitute can be on a different team from the one they
      // were shuffled into (see MatchPlayer in prisma/schema.prisma).
      const spot = match.lineup.find((m) => m.playerId === playerId);
      if (!spot) continue;

      let goalsFor = 0;
      let goalsAgainst = 0;
      let playerGoals = 0;
      let playerAssists = 0;
      for (const e of match.goalEvents) {
        if (e.teamId === spot.teamId) goalsFor++;
        else goalsAgainst++;
        if (e.scorerId === playerId) {
          playerGoals++;
          if (
            e.matchSec !== null &&
            match.durationSec !== null &&
            e.matchSec >= match.durationSec - LAST_MINUTE_SEC
          ) {
            signals.lastMinuteGoals++;
          }
        }
        if (e.assistId === playerId) playerAssists++;
      }

      const won = goalsFor > goalsAgainst;
      if (won) {
        currentStreak++;
        signals.maxWinStreak = Math.max(signals.maxWinStreak, currentStreak);
        sessionWins++;
      } else {
        currentStreak = 0;
      }
      if (!seenFirstMatch) {
        signals.firstMatchWin = won;
        seenFirstMatch = true;
      }

      if (playerAssists >= 3) signals.assistHatTricks++;
      if (playerGoals + playerAssists >= 4) signals.messiMatches++;
      if (playerGoals >= 3) sessionHatTrickMatches++;

      sessionGoals += playerGoals;
      sessionMatchesPlayed++;
    }

    signals.hatTrickSessionsMax = Math.max(signals.hatTrickSessionsMax, sessionHatTrickMatches);
    signals.sessionGoalsMax = Math.max(signals.sessionGoalsMax, sessionGoals);
    if (sessionMatchesPlayed >= 2 && sessionWins === sessionMatchesPlayed) {
      signals.perfectMatchdays++;
    }
  }

  return signals;
}

export type AchievementInput = PlayerStats & ExtraSignals & { rating: number };

export type Achievement = {
  id: string;
  name: string;
  description: string;
  category: "Scoring" | "Defense" | "Team results" | "Recognition" | "Commitment" | "Excellence";
  tier: AchievementTier;
  points: number;
  /** Single-emoji icon for the badge grid. */
  glyph: string;
  check: (s: AchievementInput) => boolean;
};

function tier(t: AchievementTier, check: Achievement["check"]) {
  return { tier: t, points: TIER_POINTS[t], check };
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  // --- Scoring ---
  {
    id: "brace",
    name: "Brace",
    description: "Score 2 goals in a single match.",
    category: "Scoring",
    glyph: "⚽",
    ...tier("bronze", (s) => s.braces > 0),
  },
  {
    id: "hat_trick",
    name: "Hat-Trick Hero",
    description: "Score 3+ goals in a single match.",
    category: "Scoring",
    glyph: "🎩",
    ...tier("silver", (s) => s.hatTricks > 0),
  },
  {
    id: "playmaker",
    name: "Playmaker",
    description: "Notch 3+ assists in a single match.",
    category: "Scoring",
    glyph: "🎯",
    ...tier("silver", (s) => s.assistHatTricks > 0),
  },
  {
    id: "like_messi",
    name: "Like Messi",
    description: "Rack up 4+ goal contributions (goals + assists) in one match.",
    category: "Scoring",
    glyph: "🐐",
    ...tier("gold", (s) => s.messiMatches > 0),
  },
  {
    id: "last_minute_hero",
    name: "Last-Minute Hero",
    description: "Score in the final minute of a timed match.",
    category: "Scoring",
    glyph: "⏱️",
    ...tier("silver", (s) => s.lastMinuteGoals > 0),
  },
  {
    id: "double_digits",
    name: "Double Digits",
    description: "Score 10+ goals in a single season.",
    category: "Scoring",
    glyph: "🔟",
    ...tier("gold", (s) => s.goals >= 10),
  },
  {
    id: "goal_machine",
    name: "Goal Machine",
    description: "Score 2+ hat-tricks in one session.",
    category: "Scoring",
    glyph: "⚙️",
    ...tier("gold", (s) => s.hatTrickSessionsMax >= 2),
  },
  {
    id: "god_of_goals",
    name: "God of Goals",
    description: "Score 10+ goals across the matches of a single session.",
    category: "Scoring",
    glyph: "⚡",
    ...tier("platinum", (s) => s.sessionGoalsMax >= 10),
  },

  // --- Defense ---
  // A clean sheet now belongs to whoever was in goal (see PlayerTotals in
  // stats.ts), so these three are a single ladder rather than the old
  // "anyone on the team" / "the keeper" split, which after the change would
  // have been two badges for exactly the same condition. Thresholds are lower
  // than the old team-wide ones because only one player per team per match
  // can earn one now.
  {
    id: "iron_wall",
    name: "Iron Wall",
    description: "Keep a clean sheet in goal.",
    category: "Defense",
    glyph: "🧱",
    ...tier("bronze", (s) => s.cleanSheets > 0),
  },
  {
    id: "the_wall",
    name: "The Wall",
    description: "Keep 3 clean sheets in goal.",
    category: "Defense",
    glyph: "🧤",
    ...tier("silver", (s) => s.cleanSheets >= 3),
  },
  {
    id: "shutout_specialist",
    name: "Shutout Specialist",
    description: "Keep 6+ clean sheets in goal.",
    category: "Defense",
    glyph: "🛡️",
    ...tier("gold", (s) => s.cleanSheets >= 6),
  },

  // --- Team results ---
  {
    id: "first_blood",
    name: "First Blood",
    description: "Win the first match you ever played.",
    category: "Team results",
    glyph: "🥇",
    ...tier("bronze", (s) => s.firstMatchWin),
  },
  {
    id: "hot_streak",
    name: "Hot Streak",
    description: "Win 3 matches in a row.",
    category: "Team results",
    glyph: "🔥",
    ...tier("silver", (s) => s.maxWinStreak >= 3),
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Win 5 matches in a row.",
    category: "Team results",
    glyph: "🚀",
    ...tier("gold", (s) => s.maxWinStreak >= 5),
  },
  {
    id: "perfect_matchday",
    name: "Perfect Matchday",
    description: "Win every match you played in a session (2+ matches).",
    category: "Team results",
    glyph: "✨",
    ...tier("silver", (s) => s.perfectMatchdays > 0),
  },

  // --- Recognition ---
  // Thresholds are scaled for *session* MVPs: at most one per matchday, where
  // the old match MVP could be won six times in a night. 5 was a reachable
  // gold under the old award and would be a season-long grind under this one.
  {
    id: "man_of_the_match",
    name: "Player of the Day",
    description: "Win your first session MVP.",
    category: "Recognition",
    glyph: "🏆",
    ...tier("bronze", (s) => s.mvps > 0),
  },
  {
    id: "crowd_favorite",
    name: "Crowd Favorite",
    description: "Win 3 session MVPs.",
    category: "Recognition",
    glyph: "📣",
    ...tier("gold", (s) => s.mvps >= 3),
  },
  {
    id: "talk_of_the_season",
    name: "Talk of the Season",
    description: "Win 2 session MVPs in a single season.",
    category: "Recognition",
    glyph: "🗣️",
    ...tier("silver", (s) => s.mvps >= 2),
  },

  // --- Commitment ---
  {
    id: "regular",
    name: "Regular",
    description: "Attend 5 matchdays.",
    category: "Commitment",
    glyph: "📅",
    ...tier("bronze", (s) => s.gamesPlayed >= 5),
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "Attend 20 matchdays.",
    category: "Commitment",
    glyph: "🎖️",
    ...tier("silver", (s) => s.gamesPlayed >= 20),
  },
  {
    id: "ever_present",
    name: "Ever-Present",
    description: "Attend 4+ matchdays within a single season.",
    category: "Commitment",
    glyph: "🌟",
    ...tier("gold", (s) => s.maxSessionsInSeason >= 4),
  },

  // --- Excellence ---
  {
    id: "rising_star",
    name: "Rising Star",
    description: "Reach a season rating of 70+.",
    category: "Excellence",
    glyph: "📈",
    ...tier("silver", (s) => s.rating >= 70),
  },
  {
    id: "elite",
    name: "Elite",
    description: "Reach a season rating of 85+.",
    category: "Excellence",
    glyph: "👑",
    ...tier("gold", (s) => s.rating >= 85),
  },
] as const;

// Omits `check`: this crosses the server/client boundary into
// AchievementBadges (a "use client" component), and functions aren't
// serializable across that boundary.
export type EvaluatedAchievement = Omit<Achievement, "check"> & { unlocked: boolean };

export function evaluateAchievements(input: AchievementInput): EvaluatedAchievement[] {
  return ACHIEVEMENTS.map(({ check, ...rest }) => ({ ...rest, unlocked: check(input) }));
}

export function achievementScore(evaluated: readonly EvaluatedAchievement[]): number {
  return evaluated.reduce((sum, a) => (a.unlocked ? sum + a.points : sum), 0);
}
