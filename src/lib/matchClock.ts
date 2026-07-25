/**
 * Match clock — pure arithmetic over the four columns `match` stores
 * (`started_at`, `duration_sec`, `paused_at`, `paused_total_sec`,
 * `break_taken_at`).
 *
 * Nothing here holds a running timer. The clock is *derived* from wall-clock
 * timestamps written by the server, which is what makes it survive a page
 * reload, a second admin opening the same match, or the courtside iPad
 * sleeping mid-game — all things a client-side `setInterval` counter would
 * silently get wrong.
 *
 * Durations are seconds throughout; the UI is the only place minutes appear.
 */

/** Longer than this and the match gets one water break at its midpoint. */
export const BREAK_THRESHOLD_SEC = 10 * 60;

export type MatchClock = {
  startedAt: number;
  /** Planned length. Null on matches started before the timer existed — those
   *  count up with no full-time marker rather than being retro-fitted a
   *  duration nobody agreed to. */
  durationSec: number | null;
  /** Set while the clock is stopped for the water break, null while running. */
  pausedAt: number | null;
  /** Seconds already spent paused, excluded from elapsed. */
  pausedTotalSec: number;
  /** Set once the water break has been taken, so resuming doesn't re-trigger it. */
  breakTakenAt: number | null;
};

/**
 * Seconds of actual play so far. While paused, the clock is frozen at the
 * moment it stopped — that is the whole point of `pausedAt`.
 */
export function elapsedSec(clock: MatchClock, now: number): number {
  const until = clock.pausedAt ?? now;
  const raw = Math.floor((until - clock.startedAt) / 1000) - clock.pausedTotalSec;
  return Math.max(0, raw);
}

/** Seconds left, floored at zero. Null when the match has no planned length. */
export function remainingSec(clock: MatchClock, now: number): number | null {
  if (clock.durationSec === null) return null;
  return Math.max(0, clock.durationSec - elapsedSec(clock, now));
}

/**
 * When the water break falls, or null if this match plays straight through.
 *
 * The break sits at the *midpoint*, not at a fixed 10:00: a 16-minute match
 * breaks at 8:00, where stopping at 10:00 would leave a lopsided six-minute
 * second half.
 */
export function breakAtSec(durationSec: number | null): number | null {
  if (durationSec === null || durationSec <= BREAK_THRESHOLD_SEC) return null;
  return Math.floor(durationSec / 2);
}

/** True the moment play reaches the midpoint of a break-eligible match. */
export function isBreakDue(clock: MatchClock, now: number): boolean {
  if (clock.breakTakenAt !== null) return false;
  const at = breakAtSec(clock.durationSec);
  if (at === null) return false;
  return elapsedSec(clock, now) >= at;
}

/** True once the planned duration is used up. */
export function isFullTime(clock: MatchClock, now: number): boolean {
  if (clock.durationSec === null) return false;
  return elapsedSec(clock, now) >= clock.durationSec;
}

/** Whatever the big numerals should read: counting down when a duration was
 *  set, counting up when it wasn't. */
export function displaySec(clock: MatchClock, now: number): number {
  return remainingSec(clock, now) ?? elapsedSec(clock, now);
}

/** `mm:ss`, zero-padded, minutes uncapped so a 90-minute match still reads. */
export function formatClock(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Duration presets offered on the start-match card, in minutes. */
export const DURATION_PRESETS_MIN = [8, 10, 12, 15, 20] as const;
export const DEFAULT_DURATION_MIN = 12;
/** Guard rails for the custom field — also enforced server-side. */
export const MIN_DURATION_MIN = 1;
export const MAX_DURATION_MIN = 90;
