import { describe, expect, it } from "vitest";
import { isSequenced, orderGoals } from "./goalOrder";

/** `m` is minutes, for readability; the type stores seconds. */
const goal = (seq: number, m: number | null) => ({ seq, matchSec: m === null ? null : m * 60 });

describe("orderGoals", () => {
  it("puts a goal added after the fact back in its minute", () => {
    // A 3' goal logged last, as happens when someone remembers it afterwards.
    const ordered = orderGoals([goal(1, 10), goal(2, 20), goal(3, 3)]);
    expect(ordered.map((g) => g.matchSec)).toEqual([180, 600, 1200]);
  });

  it("sends goals with no minute to the end", () => {
    const ordered = orderGoals([goal(1, null), goal(2, 12), goal(3, 4)]);
    expect(ordered.map((g) => g.seq)).toEqual([3, 2, 1]);
  });

  it("keeps unminuted goals in their existing order rather than guessing", () => {
    const ordered = orderGoals([goal(3, null), goal(1, null), goal(2, null)]);
    expect(ordered.map((g) => g.seq)).toEqual([1, 2, 3]);
  });

  it("breaks a same-minute tie on existing order, so the sort is stable", () => {
    const ordered = orderGoals([goal(2, 7), goal(1, 7)]);
    expect(ordered.map((g) => g.seq)).toEqual([1, 2]);
  });

  it("is idempotent — reordering an ordered list changes nothing", () => {
    const once = orderGoals([goal(1, 9), goal(2, 2), goal(3, null)]);
    const twice = orderGoals(once);
    expect(twice).toEqual(once);
  });

  it("does not mutate its input", () => {
    const goals = [goal(1, 30), goal(2, 5)];
    orderGoals(goals);
    expect(goals.map((g) => g.seq)).toEqual([1, 2]);
  });
});

describe("isSequenced", () => {
  it("is true when the goals are already 1..n in minute order", () => {
    expect(isSequenced([goal(1, 3), goal(2, 8), goal(3, null)])).toBe(true);
  });

  it("is false when a minute puts a goal out of position", () => {
    expect(isSequenced([goal(1, 8), goal(2, 3)])).toBe(false);
  });

  it("is false when an unminuted goal sits before a minuted one", () => {
    expect(isSequenced([goal(1, null), goal(2, 5)])).toBe(false);
  });

  it("is true for a match with no goals", () => {
    expect(isSequenced([])).toBe(true);
  });
});
