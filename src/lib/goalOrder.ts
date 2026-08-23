/**
 * The order a match's goals are told in.
 *
 * `GoalEvent.seq` is what every match report renders by, and during a live
 * match it is simply the order they were tapped in — which is chronological
 * for free. Corrections break that: a goal added afterwards, or one whose
 * minute is fixed later, would sit wherever it happened to be inserted.
 *
 * Kept out of `corrections.ts` because that file is `"use server"`, where
 * every export has to be an async action — a pure comparator can't live there,
 * and this is the part worth testing.
 */

export type OrderableGoal = {
  seq: number;
  /** Elapsed match clock in seconds, or null when nobody noted a minute. */
  matchSec: number | null;
};

/**
 * Chronological, with unminuted goals last.
 *
 * A goal with no minute can't be placed against one that has a minute, and
 * guessing would move it around every time an unrelated goal is edited.
 * Sending it to the end keeps it in one predictable spot; ties and unminuted
 * goals both fall back to existing `seq`, so the sort is stable and repeated
 * runs don't shuffle anything.
 */
export function compareGoals(a: OrderableGoal, b: OrderableGoal): number {
  if (a.matchSec === null && b.matchSec === null) return a.seq - b.seq;
  if (a.matchSec === null) return 1;
  if (b.matchSec === null) return -1;
  return a.matchSec - b.matchSec || a.seq - b.seq;
}

/** The same list in telling order, without mutating the input. */
export function orderGoals<T extends OrderableGoal>(goals: readonly T[]): T[] {
  return [...goals].sort(compareGoals);
}

/** Whether `goals` are already numbered 1..n in telling order — nothing to rewrite. */
export function isSequenced(goals: readonly OrderableGoal[]): boolean {
  return orderGoals(goals).every((goal, i) => goal.seq === i + 1);
}
