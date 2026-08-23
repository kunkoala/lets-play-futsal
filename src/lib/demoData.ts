/**
 * A synthetic season for the `/demo` pages.
 *
 * Nothing here touches the database — the whole season is generated in memory
 * from a fixed seed, so it is byte-identical on every request and every deploy,
 * and no fake player can ever leak into the real player list, a real check-in
 * sheet, or the real all-time stats.
 *
 * It deliberately goes through the production code paths: teams are picked by
 * the real `shuffleIntoTeamsWithKeepers`, and standings come out of the real
 * `aggregateSeason`. The demo therefore shows what the app actually does,
 * rather than a mock-up of it.
 *
 * IDs are offset well clear of anything the database would produce, so a demo
 * id pasted into a real URL misses rather than collides.
 */
import { shuffleIntoTeamsWithKeepers, type KeeperPref } from "@/lib/shuffle";
import { paletteFor } from "@/lib/teamPalette";
import { aggregateSeason, type PlayerSeasonStats } from "@/lib/seasonAggregate";
import { applyMatch, emptyTotals, withRates, type PlayerStats } from "@/lib/stats";
import { DEFAULT_DURATION_MIN } from "@/lib/matchClock";
import { deriveExtraSignals, type ExtraSignals } from "@/lib/achievements";

/** No real clock behind the demo, so goal minutes are scattered across a
 *  match of this length rather than derived from one. */
const DEMO_MATCH_DURATION_SEC = DEFAULT_DURATION_MIN * 60;

const PLAYER_ID_BASE = 90_000;
const SESSION_ID_BASE = 80_000;
const TEAM_ID_BASE = 70_000;
const MATCH_ID_BASE = 60_000;
const EVENT_ID_BASE = 50_000;

const SEASON = {
  id: 99_000,
  name: "Demo Season",
  startsOn: new Date("2026-02-01"),
  endsOn: new Date("2026-06-30"),
  isActive: true,
};

/** First matchday; the rest fall on the following Sundays. */
const FIRST_MATCHDAY = new Date("2026-02-08");
const MATCHDAY_COUNT = 9;
const TEAM_SIZE = 5;

/**
 * Fictional squad. `skill` biases how often someone scores or assists — without
 * it every player converges on the same numbers over nine matchdays and the
 * leaderboard looks suspiciously flat.
 */
const SQUAD: { name: string; keeperPref: KeeperPref; skill: number }[] = [
  { name: "Arga Wibisono", keeperPref: "outfield", skill: 9 },
  { name: "Bayu Kusuma", keeperPref: "outfield", skill: 8 },
  { name: "Candra Halim", keeperPref: "outfield", skill: 7 },
  { name: "Damar Prakoso", keeperPref: "goalkeeper", skill: 2 },
  { name: "Egi Mahendra", keeperPref: "outfield", skill: 6 },
  { name: "Farel Adiputra", keeperPref: "outfield", skill: 8 },
  { name: "Galih Sanjaya", keeperPref: "flexible", skill: 4 },
  { name: "Hendra Wicaksono", keeperPref: "outfield", skill: 5 },
  { name: "Irfan Baskoro", keeperPref: "outfield", skill: 6 },
  { name: "Jalu Pamungkas", keeperPref: "goalkeeper", skill: 2 },
  { name: "Kevin Alfaro", keeperPref: "outfield", skill: 7 },
  { name: "Lukman Hadi", keeperPref: "outfield", skill: 4 },
  { name: "Miko Ardiansyah", keeperPref: "outfield", skill: 5 },
  { name: "Naufal Ghani", keeperPref: "flexible", skill: 3 },
  { name: "Oka Pradipta", keeperPref: "outfield", skill: 6 },
  { name: "Panji Nugraha", keeperPref: "outfield", skill: 4 },
  { name: "Rangga Saputra", keeperPref: "outfield", skill: 7 },
  { name: "Satria Ramadhan", keeperPref: "outfield", skill: 5 },
];

export type DemoPlayer = {
  id: number;
  name: string;
  isActive: boolean;
  keeperPref: KeeperPref;
};

export type DemoTeam = {
  id: number;
  sessionId: number;
  name: string;
  color: string;
  players: { playerId: number; isKeeper: boolean; player: DemoPlayer }[];
};

export type DemoGoalEvent = {
  id: number;
  seq: number;
  teamId: number;
  scorerId: number | null;
  assistId: number | null;
  scorer: DemoPlayer | null;
  assist: DemoPlayer | null;
  matchSec: number;
};

export type DemoMatch = {
  id: number;
  seq: number;
  sessionId: number;
  status: "finished";
  homeTeamId: number;
  awayTeamId: number;
  homeTeam: DemoTeam;
  awayTeam: DemoTeam;
  /** Every demo match plays the same fixed length — see DEMO_MATCH_DURATION_SEC. */
  durationSec: number;
  goalEvents: DemoGoalEvent[];
};

export type DemoSession = {
  id: number;
  seasonId: number;
  date: Date;
  status: "completed";
  season: { id: number; name: string };
  attendances: { playerId: number }[];
  mvpPlayerId: number | null;
  mvpPlayer: DemoPlayer | null;
  teams: DemoTeam[];
  matches: DemoMatch[];
};

/**
 * mulberry32 — small, fast, and fully determined by its seed, which is the
 * only property that matters here.
 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Picks one entry, with each item's chance proportional to its weight. */
function weightedPick<T>(rng: () => number, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let roll = rng() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function buildSeason() {
  const rng = makeRng(20260725);

  const players: DemoPlayer[] = SQUAD.map((p, i) => ({
    id: PLAYER_ID_BASE + i + 1,
    name: p.name,
    isActive: true,
    keeperPref: p.keeperPref,
  }));
  const skillById = new Map<number, number>(
    players.map((p, i) => [p.id, SQUAD[i].skill]),
  );

  const sessions: DemoSession[] = [];
  let teamIdSeq = TEAM_ID_BASE;
  let matchIdSeq = MATCH_ID_BASE;
  let eventIdSeq = EVENT_ID_BASE;

  for (let day = 0; day < MATCHDAY_COUNT; day++) {
    const sessionId = SESSION_ID_BASE + day + 1;
    const date = new Date(FIRST_MATCHDAY);
    date.setDate(date.getDate() + day * 7);

    // Not everyone turns up every week — that's what makes matchdays-played
    // and the per-match rates diverge from the raw totals.
    const attending = players.filter(() => rng() > 0.18);
    const roster = attending.length >= 10 ? attending : players.slice(0, 15);

    const split = shuffleIntoTeamsWithKeepers(
      roster.map((p) => ({ id: p.id, keeperPref: p.keeperPref })),
      TEAM_SIZE,
      rng,
    );

    const playerById = new Map(players.map((p) => [p.id, p]));
    const teams: DemoTeam[] = split.map((team, index) => {
      const { name, color } = paletteFor(index);
      return {
        id: ++teamIdSeq,
        sessionId,
        name,
        color,
        players: team.playerIds.map((playerId) => ({
          playerId,
          isKeeper: playerId === team.keeperId,
          player: playerById.get(playerId)!,
        })),
      };
    });

    // Round robin: every team plays every other team once.
    const matches: DemoMatch[] = [];
    let seq = 0;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const homeTeam = teams[i];
        const awayTeam = teams[j];
        const goalEvents: DemoGoalEvent[] = [];
        let eventSeq = 0;

        for (const team of [homeTeam, awayTeam]) {
          // Outfielders score; a keeper joining the attack is a distraction the
          // demo doesn't need.
          const scorers = team.players.filter((tp) => !tp.isKeeper);
          const goals = randomInt(rng, 0, 4);
          for (let g = 0; g < goals; g++) {
            const scorer = weightedPick(rng, scorers, (tp) => skillById.get(tp.playerId) ?? 1);
            const others = scorers.filter((tp) => tp.playerId !== scorer.playerId);
            // Roughly two in three goals get an assist, matching how the live
            // console is actually used.
            const assist =
              others.length > 0 && rng() < 0.65
                ? weightedPick(rng, others, (tp) => skillById.get(tp.playerId) ?? 1)
                : null;
            goalEvents.push({
              id: ++eventIdSeq,
              seq: ++eventSeq,
              teamId: team.id,
              scorerId: scorer.playerId,
              assistId: assist?.playerId ?? null,
              scorer: scorer.player,
              assist: assist?.player ?? null,
              matchSec: randomInt(rng, 0, DEMO_MATCH_DURATION_SEC - 1),
            });
          }
        }

        // Goals were pushed team-by-team above, not in the order they'd
        // actually fall in a match — re-sort chronologically by the minute
        // just assigned, and renumber `seq` to match, same as a real admin
        // recording them live in order.
        goalEvents.sort((a, b) => a.matchSec - b.matchSec);
        goalEvents.forEach((e, index) => {
          e.seq = index + 1;
        });

        matches.push({
          id: ++matchIdSeq,
          seq: ++seq,
          sessionId,
          status: "finished",
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeTeam,
          awayTeam,
          durationSec: DEMO_MATCH_DURATION_SEC,
          goalEvents,
        });
      }
    }

    // One player of the day for the whole matchday, weighted toward whoever
    // did the most across the night — the instinct an admin picking at the end
    // of the evening would follow.
    const contribution = new Map<number, number>();
    for (const match of matches) {
      for (const e of match.goalEvents) {
        if (e.scorerId) contribution.set(e.scorerId, (contribution.get(e.scorerId) ?? 0) + 2);
        if (e.assistId) contribution.set(e.assistId, (contribution.get(e.assistId) ?? 0) + 1);
      }
    }
    const mvp = weightedPick(rng, roster, (p) => 1 + (contribution.get(p.id) ?? 0) * 3);

    sessions.push({
      id: sessionId,
      seasonId: SEASON.id,
      date,
      status: "completed",
      season: { id: SEASON.id, name: SEASON.name },
      attendances: roster.map((p) => ({ playerId: p.id })),
      mvpPlayerId: mvp.id,
      mvpPlayer: mvp,
      teams,
      matches,
    });
  }

  const standings = aggregateSeason(
    sessions,
    [...players].sort((a, b) => a.name.localeCompare(b.name)),
  );

  return { season: SEASON, players, sessions, standings };
}

/**
 * Built once per server process and reused. Generation is deterministic, so
 * caching is purely to avoid redoing the work on every request.
 */
let cached: ReturnType<typeof buildSeason> | null = null;

function demo() {
  cached ??= buildSeason();
  return cached;
}

export function getDemoSeason() {
  return demo().season;
}

export function getDemoLeaderboard(): PlayerSeasonStats[] {
  return demo().standings;
}

/** Newest matchday first, matching the real sessions list. */
export function getDemoSessions(): DemoSession[] {
  return [...demo().sessions].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getDemoSession(id: number): DemoSession | null {
  return demo().sessions.find((s) => s.id === id) ?? null;
}

export function getDemoPlayer(id: number): DemoPlayer | null {
  return demo().players.find((p) => p.id === id) ?? null;
}

export type DemoPlayerHistoryRow = {
  sessionId: number;
  date: Date;
  seasonName: string;
  team: { id: number; name: string; color: string } | null;
  keeper: boolean;
  goals: number;
  assists: number;
  /** Whether this player was the session MVP that day. */
  mvp: boolean;
};

export type DemoPlayerProfile = {
  player: DemoPlayer;
  totals: PlayerStats;
  seasonName: string;
  /** Newest matchday first. */
  history: DemoPlayerHistoryRow[];
  extraSignals: ExtraSignals;
};

/**
 * Per-player view of the demo season, walked oldest-first through the same
 * `applyMatch` the real profile uses so the form guide and rates line up.
 */
export function getDemoPlayerProfile(playerId: number): DemoPlayerProfile | null {
  const { players, sessions, season } = demo();
  const player = players.find((p) => p.id === playerId);
  if (!player) return null;

  const totals = emptyTotals();
  const history: DemoPlayerHistoryRow[] = [];

  for (const session of sessions) {
    if (!session.attendances.some((a) => a.playerId === playerId)) continue;
    totals.gamesPlayed += 1;

    const sessionMvp = session.mvpPlayerId === playerId;
    if (sessionMvp) totals.mvps += 1;

    const team = session.teams.find((t) => t.players.some((tp) => tp.playerId === playerId)) ?? null;
    const keeper = team?.players.find((tp) => tp.playerId === playerId)?.isKeeper ?? false;

    const row: DemoPlayerHistoryRow = {
      sessionId: session.id,
      date: session.date,
      seasonName: season.name,
      team: team ? { id: team.id, name: team.name, color: team.color } : null,
      keeper,
      goals: 0,
      assists: 0,
      mvp: sessionMvp,
    };

    for (const match of session.matches) {
      const onHome = team !== null && match.homeTeamId === team.id;
      const onAway = team !== null && match.awayTeamId === team.id;
      if (!onHome && !onAway) continue;

      let home = 0;
      let away = 0;
      let playerGoals = 0;
      let assists = 0;
      for (const e of match.goalEvents) {
        if (e.teamId === match.homeTeamId) home++;
        else away++;
        if (e.scorerId === playerId) playerGoals += 1;
        if (e.assistId === playerId) assists += 1;
      }

      applyMatch(totals, {
        goalsFor: onHome ? home : away,
        goalsAgainst: onHome ? away : home,
        playerGoals,
        assists,
        keeper,
      });

      row.goals += playerGoals;
      row.assists += assists;
    }

    history.push(row);
  }

  return {
    player,
    totals: withRates(totals),
    seasonName: season.name,
    history: history.reverse(),
    // deriveExtraSignals already skips sessions this player wasn't rostered
    // in, so passing the whole demo season is safe here.
    extraSignals: deriveExtraSignals(sessions, playerId),
  };
}
